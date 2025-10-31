import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * CONFIG
 */
const MODEL = "imagen-4.0-generate-001"; // Imagen 4 standard
const ASPECT_RATIO: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "1:1";
const OUTPUT_DIR = path.resolve("gen_images");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

/** Inference heuristics for text→icon */
const MAX_LABEL_WORDS = 6;      // skip big sentences
const MAX_LABEL_CHARS = 48;     // skip paragraphs
const STYLE_SUFFIX =
  " icon, simple outline, minimal, monochrome, high-contrast, flat pictogram, centered";

/**
 * HELPERS
 */
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function isPng(buf: Buffer) {
  return buf.length >= 8 && PNG_MAGIC.equals(buf.subarray(0, 8));
}

function toDataUrlPng(b64: string) {
  return `data:image/png;base64,${b64}`;
}

function safeFilename(s: string) {
  return (
    (s || "image")
      .replace(/[^a-z0-9-_ ]/gi, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 80) || crypto.randomUUID()
  );
}

function normText(t?: string) {
  return (t || "").trim().replace(/\s+/g, " ");
}

const IMG_TAG_RE = /\[\[\s*img\s*:\s*(.+?)\s*\]\]/i;

type ExcalElement = {
  id?: string;
  type?: string;
  text?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

type ExcalScene = {
  type?: string;
  version?: number;
  source?: string;
  elements?: ExcalElement[];
  appState?: Record<string, unknown>;
};

type GenerateResult = {
  elementId?: string;
  prompt: string;
  file: string;
  dataURL: string;
};

type ImageSkeleton = {
  type: "image";
  x: number;
  y: number;
  width: number;
  height: number;
  fileId: string;
};

/**
 * Extract explicit [[img: ...]] prompts from an Excalidraw scene
 */
function extractTaggedPrompts(
  excal: ExcalScene
): Array<{ el: ExcalElement; prompt: string }> {
  const elements = excal?.elements || [];
  const found: Array<{ el: ExcalElement; prompt: string }> = [];
  for (const el of elements) {
    if (el.type === "text" && typeof el.text === "string") {
      const m = el.text.match(IMG_TAG_RE);
      if (m?.[1]) {
        const prompt = m[1].trim();
        if (prompt) found.push({ el, prompt });
      }
    }
  }
  return found;
}

/**
 * Infer prompts from short text labels (when no tags are present)
 * e.g., "Calendar" => "calendar icon, simple outline, minimal ..."
 */
function inferPromptsFromLabels(
  excal: ExcalScene
): Array<{ el: ExcalElement; prompt: string }> {
  const elements = excal?.elements || [];
  const out: Array<{ el: ExcalElement; prompt: string }> = [];

  const seen = new Set<string>();
  for (const el of elements) {
    if (el.type !== "text" || typeof el.text !== "string") continue;

    const raw = normText(el.text);
    if (!raw) continue;

    // skip anything that already contains [[img:
    if (IMG_TAG_RE.test(raw)) continue;

    // basic heuristics to avoid paragraphs
    if (raw.length > MAX_LABEL_CHARS) continue;
    const words = raw.split(/\s+/);
    if (words.length === 0 || words.length > MAX_LABEL_WORDS) continue;

    // normalize prompt text (lowercase single-word labels, keep multi-word case sane)
    const base = raw.trim();
    const prompt = `${base} ${STYLE_SUFFIX}`.trim();

    const key = prompt.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({ el, prompt });
  }
  return out;
}

/**
 * Generate a single PNG for a prompt using Imagen 4
 */
async function imagenGeneratePngB64(
  ai: GoogleGenAI,
  prompt: string
): Promise<string> {
  const response = await ai.models.generateImages({
    model: MODEL,
    prompt,
    config: {
      numberOfImages: 1,
      aspectRatio: ASPECT_RATIO,
      outputMimeType: "image/png" as any,
    },
  });

  const img = response.generatedImages?.[0]?.image?.imageBytes;
  if (!img) {
    throw new Error("No image bytes returned from Imagen.");
  }
  return img; // base64 string
}

/**
 * MAIN: from Excalidraw -> images (tags first; else infer from labels)
 */
export async function generateImagesFromExcalidraw(
  excal: ExcalScene
): Promise<{ results: GenerateResult[]; image_skeletons: ImageSkeleton[] }> {
  const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
  });

  let pairs = extractTaggedPrompts(excal);
  if (pairs.length === 0) {
    pairs = inferPromptsFromLabels(excal);
    if (pairs.length === 0) {
      console.log("No suitable text labels found to infer image prompts.");
      return { results: [], image_skeletons: [] };
    } else {
      console.log(`Inferred ${pairs.length} image prompt(s) from text labels.`);
    }
  } else {
    console.log(`Found ${pairs.length} explicit [[img: ...]] prompt(s).`);
  }

  const results: GenerateResult[] = [];
  const image_skeletons: ImageSkeleton[] = [];

  for (const { el, prompt } of pairs) {
    console.log(`Generating: "${prompt}"`);

    const b64 = await imagenGeneratePngB64(ai, prompt);
    const buf = Buffer.from(b64, "base64");
    if (!isPng(buf)) {
      throw new Error("Returned data is not a valid PNG file.");
    }

    const name = safeFilename(prompt);
    const fpath = path.join(OUTPUT_DIR, `${name}.png`);
    fs.writeFileSync(fpath, buf);

    results.push({
      elementId: el.id,
      prompt,
      file: fpath,
      dataURL: toDataUrlPng(b64),
    });

    // Place the image near the source text (slight offset down/right)
    const fileId = `file-${el.id ?? crypto.randomUUID()}`;
    const baseX = el.x ?? 0;
    const baseY = el.y ?? 0;
    image_skeletons.push({
      type: "image",
      x: baseX + 12,
      y: baseY + 24,
      width: 256,
      height: 256,
      fileId,
    });
  }

  return { results, image_skeletons };
}

/**
 * DEMO RUN (optional)
 */
const EXCALIDRAW_CONTEXT: ExcalScene = {
  type: "excalidraw",
  version: 2,
  source: "excalidraw",
  elements: [
    // Try both styles:
    { type: "text", id: "t1", x: 100, y: 80, text: "[[img: bar chart icon minimal]]" },
    { type: "text", id: "t2", x: 350, y: 120, text: "Calendar" },
    { type: "text", id: "t3", x: 600, y: 160, text: "Graduation cap" },
    { type: "rectangle", x: 80, y: 200, width: 200, height: 100 },
  ],
  appState: { viewBackgroundColor: "#ffffff" },
};

// --- ESM-safe "run if entrypoint" check ---
async function main() {
  const { results, image_skeletons } = await generateImagesFromExcalidraw(
    EXCALIDRAW_CONTEXT
  );

  console.log("\nGenerated images:");
  for (const r of results) console.log(` - ${r.prompt} -> ${r.file}`);

  console.log("\nImage element skeletons:");
  console.log(JSON.stringify(image_skeletons, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
