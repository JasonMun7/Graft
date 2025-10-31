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
 * Core: extract [[img: ...]] prompts from an Excalidraw scene
 */
function extractImgPrompts(
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

  // The SDK returns base64 under generatedImages[i].image.imageBytes
  const img = response.generatedImages?.[0]?.image?.imageBytes;
  if (!img) {
    throw new Error("No image bytes returned from Imagen.");
  }
  return img; // base64 string
}

/**
 * MAIN: from Excalidraw -> images
 */
export async function generateImagesFromExcalidraw(
  excal: ExcalScene
): Promise<{ results: GenerateResult[]; image_skeletons: ImageSkeleton[] }> {
  const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
  });

  const tagged = extractImgPrompts(excal);
  if (tagged.length === 0) {
    console.log("No [[img: ...]] prompts found in the Excalidraw scene.");
    return { results: [], image_skeletons: [] };
  }

  const results: GenerateResult[] = [];
  const image_skeletons: ImageSkeleton[] = [];

  for (const { el, prompt } of tagged) {
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

    // Create a minimal Excalidraw image skeleton co-located with the text element
    const fileId = `file-${el.id ?? crypto.randomUUID()}`;
    image_skeletons.push({
      type: "image",
      x: el.x ?? 0,
      y: el.y ?? 0,
      width: 256,
      height: 256,
      fileId,
    });
  }

  return { results, image_skeletons };
}

/**
 * DEMO RUN
 */
const EXCALIDRAW_CONTEXT: ExcalScene = {
  type: "excalidraw",
  version: 2,
  source: "excalidraw",
  elements: [
    { type: "text", id: "t1", x: 100, y: 80, text: "[[img: bar chart icon minimal]]" },
    { type: "text", id: "t2", x: 350, y: 120, text: "[[img: calendar icon outline]]" },
    { type: "text", id: "t3", x: 600, y: 160, text: "[[img: graduation cap icon]]" },
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
  for (const r of results) {
    console.log(` - ${r.prompt} -> ${r.file}`);
  }

  console.log(
    "\nImage element skeletons (for convertToExcalidrawElements on the JS side):"
  );
  console.log(JSON.stringify(image_skeletons, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
