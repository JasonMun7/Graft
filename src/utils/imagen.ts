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

/** Limits & heuristics */
const MAX_IMAGES = 10;          // ← hard cap
const MAX_LABEL_WORDS = 6;      // avoid long sentences
const MAX_LABEL_CHARS = 48;     // avoid paragraphs
const STYLE_SUFFIX =
  " icon, simple outline, minimal, monochrome, high-contrast, flat pictogram, centered";

/** Which element types count as “boxes” (AABB check) */
const BOX_TYPES = new Set([
  "rectangle",
  "diamond",
  "ellipse",
  "round-rectangle",
  "roundRect",
  "rounded-rectangle",
  "frame", // optional; include if you want text-in-frame to count
]);

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
  angle?: number;
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
 * Geometry util: is a point inside an element’s axis-aligned bounding box?
 */
function pointInAABB(
  px: number,
  py: number,
  el: Pick<ExcalElement, "x" | "y" | "width" | "height">
) {
  const x = el.x ?? 0;
  const y = el.y ?? 0;
  const w = el.width ?? 0;
  const h = el.height ?? 0;
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

/**
 * Collect text whose CENTER lies inside any “box-like” shape.
 * (Ignores arrows/lines by design. Only text-in-box gets considered.)
 */
function inferPromptsFromBoxText(
  excal: ExcalScene
): Array<{ el: ExcalElement; prompt: string }> {
  const elements = excal?.elements || [];
  const boxes = elements.filter((e) => BOX_TYPES.has((e.type || "").toLowerCase()));

  const out: Array<{ el: ExcalElement; prompt: string }> = [];
  const seen = new Set<string>();

  for (const el of elements) {
    if (el.type !== "text" || typeof el.text !== "string") continue;

    const raw = normText(el.text);
    if (!raw) continue;
    if (IMG_TAG_RE.test(raw)) continue; // explicit tags handled elsewhere

    // basic heuristics
    if (raw.length > MAX_LABEL_CHARS) continue;
    const words = raw.split(/\s+/);
    if (words.length === 0 || words.length > MAX_LABEL_WORDS) continue;

    // must be inside at least one “box”
    const tx = el.x ?? 0;
    const ty = el.y ?? 0;
    const tw = el.width ?? 0;
    const th = el.height ?? 0;
    const cx = tx + tw / 2;
    const cy = ty + th / 2;

    const insideABox = boxes.some((b) => pointInAABB(cx, cy, b));
    if (!insideABox) continue;

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
 * MAIN: from Excalidraw -> images
 * Priority:
 *  1) explicit [[img: ...]] prompts
 *  2) otherwise, infer from text INSIDE box-like shapes only
 * Also capped to MAX_IMAGES total.
 */
export async function generateImagesFromExcalidraw(
  excal: ExcalScene
): Promise<{ results: GenerateResult[]; image_skeletons: ImageSkeleton[] }> {
  const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
  });

  let pairs = extractTaggedPrompts(excal);
  if (pairs.length === 0) {
    pairs = inferPromptsFromBoxText(excal);
    if (pairs.length === 0) {
      console.log("No suitable box-contained text found to infer image prompts.");
      return { results: [], image_skeletons: [] };
    } else {
      console.log(`Inferred ${pairs.length} prompt(s) from text inside boxes.`);
    }
  } else {
    console.log(`Found ${pairs.length} explicit [[img: ...]] prompt(s).`);
  }

  // hard limit
  if (pairs.length > MAX_IMAGES) {
    pairs = pairs.slice(0, MAX_IMAGES);
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
    { type: "text", id: "t-box", x: 120, y: 110, width: 80, height: 20, text: "Calendar" },
    { type: "rectangle", id: "r1", x: 100, y: 100, width: 160, height: 80 },
    { type: "arrow", id: "a1", x: 300, y: 140, width: 120, height: 0 }, // ignored
    { type: "text", id: "t-free", x: 450, y: 160, width: 100, height: 20, text: "Floating label" }, // not inside a box → ignored
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
