import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import * as dotenv from "dotenv";
import { PNG } from "pngjs";

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
  " icon, simple outline, minimal, monochrome, centered," +
  " flat pictogram, no shadow, no border," +
  " on a pure white background," +
  " no watermark, no logo, no corner marks, no signature, no text";

/** Which element types count as “boxes” (AABB check) */
const BOX_TYPES = new Set([
  "rectangle",
  "diamond",
  "ellipse",
  "round-rectangle",
  "roundrect",
  "rounded-rectangle",
  "frame",
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
 * Collect text whose CENTER lies inside any “box-like” shape and
 * return the text + its containing box so we can position the image
 * relative to that box later.
 */
function inferPromptsFromBoxText(
  excal: ExcalScene
): Array<{ el: ExcalElement; prompt: string; box: ExcalElement }> {
  const elements = excal?.elements || [];
  const toType = (t?: string) => (t || "").toLowerCase();

  const boxes = elements.filter((e) => BOX_TYPES.has(toType(e.type)));

  const out: Array<{ el: ExcalElement; prompt: string; box: ExcalElement }> = [];
  const seen = new Set<string>();

  for (const el of elements) {
    if (toType(el.type) !== "text" || typeof el.text !== "string") continue;

    const raw = normText(el.text);
    if (!raw) continue;
    if (IMG_TAG_RE.test(raw)) continue; // explicit tags handled elsewhere

    // heuristics to avoid paragraphs / long lines
    if (raw.length > MAX_LABEL_CHARS) continue;
    const words = raw.split(/\s+/);
    if (words.length === 0 || words.length > MAX_LABEL_WORDS) continue;

    // text center
    const tx = el.x ?? 0;
    const ty = el.y ?? 0;
    const tw = el.width ?? 0;
    const th = el.height ?? 0;
    const cx = tx + tw / 2;
    const cy = ty + th / 2;

    // find the first box that contains this text center
    const containing = boxes.find((b) => pointInAABB(cx, cy, b));
    if (!containing) continue;

    const base = raw.trim();
    const prompt = `${base} ${STYLE_SUFFIX}`.trim();
    const key = prompt.toLowerCase() + "|" + (containing.id ?? "noid");

    if (seen.has(key)) continue;
    seen.add(key);

    out.push({ el, prompt, box: containing });
  }
  return out;
}

/**
 * Sanitize and fallback helpers
 */
function looksUnsafe(label: string) {
  const s = label.toLowerCase();
  return /\b(isis|al[-\s]?qaeda|terror|bomb|assault|murder|kill|drugs?|weapon|gun|extremis(t|m))\b/.test(s);
}

function toSafeFallback(label: string) {
  const s = label.toLowerCase();

  if (/\b(isis|al[-\s]?qaeda|terror)\b/.test(s)) {
    return "alert triangle warning icon, simple outline, minimal, monochrome, centered, flat pictogram, no shadow, no border, pure white background, no watermark";
  }
  if (/\barrest|detain|custody\b/.test(s)) {
    return "handcuffs icon, simple outline, minimal, monochrome, centered, flat pictogram, no shadow, no border, pure white background, no watermark";
  }
  if (/\bfbi|cia|police|agency\b/.test(s)) {
    return "badge icon, simple outline, minimal, monochrome, centered, flat pictogram, no shadow, no border, pure white background, no watermark";
  }

  return "generic symbol icon, simple outline, minimal, monochrome, centered, flat pictogram, no shadow, no border, pure white background, no watermark";
}

function extractBaseLabelFromPrompt(prompt: string) {
  const idx = prompt.indexOf(" icon,");
  if (idx > 0) return prompt.slice(0, idx);
  return prompt;
}

/**
 * Imagen call with safety-reason logging
 */
async function imagenGeneratePngB64(ai: GoogleGenAI, prompt: string): Promise<string> {
  const response = await ai.models.generateImages({
    model: MODEL,
    prompt,
    config: {
      numberOfImages: 1,
      aspectRatio: ASPECT_RATIO,
      outputMimeType: "image/png" as any,
    },
  });

  if (!response?.generatedImages?.length) {
    const reason =
      (response as any)?.promptFeedback?.blockReason ||
      (response as any)?.filteredReason ||
      "unknown";
    throw new Error(`Blocked/empty image for prompt (reason: ${reason})`);
  }

  const img = response.generatedImages?.[0]?.image?.imageBytes;
  if (!img) {
    const reason =
      (response as any)?.promptFeedback?.blockReason ||
      (response as any)?.filteredReason ||
      "unknown";
    throw new Error(`No image bytes returned (reason: ${reason})`);
  }
  return img;
}

/**
 * Knock out all near-white pixels (anywhere in the image).
 * threshold: 0..255 — pixels with R,G,B >= threshold are made fully transparent
 * feather:   0..60  — softly reduce alpha for pixels close to threshold (optional)
 */
function knockOutAllNearWhite(
  pngBuffer: Buffer,
  { threshold = 245, feather = 12 }: { threshold?: number; feather?: number } = {},
): Buffer {
  const png = PNG.sync.read(pngBuffer); // {width,height,data}
  const { data, width, height } = png;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const a = data[i + 3];

    if (r >= threshold && g >= threshold && b >= threshold) {
      // hard knockout
      data[i + 3] = 0;
      // damp RGB so edge compositing doesn’t ghost
      data[i] = 0; data[i + 1] = 0; data[i + 2] = 0;
    } else if (feather > 0) {
      const near = threshold - feather; // start of feather band
      const maxc = Math.max(r, g, b);
      if (maxc >= near) {
        const t = (maxc - near) / feather;      // 0..1
        const newA = Math.max(0, Math.min(255, Math.round(a * (1 - t))));
        data[i + 3] = newA;
      }
    }
  }

  const out = new PNG({ width, height, colorType: 6 });
  out.data = data;
  return PNG.sync.write(out);
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
): Promise<{ results: GenerateResult[]; image_skeletons: ImageSkeleton[]; box_updates: Array<{ id: string; width?: number; height?: number }> }> {
  const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_API_KEY,
  });

  // Accept tagged prompts OR inferred prompts (with box)
  const tagged = extractTaggedPrompts(excal); // { el, prompt }
  let pairs: Array<{ el: ExcalElement; prompt: string; box?: ExcalElement }> = [];

  if (tagged.length > 0) {
    console.log(`Found ${tagged.length} explicit [[img: ...]] prompt(s).`);
    pairs = tagged.map((t) => ({ ...t, box: undefined }));
  } else {
    const inferred = inferPromptsFromBoxText(excal); // { el, prompt, box }
    if (inferred.length === 0) {
      console.log("No suitable box-contained text found to infer image prompts.");
      return { results: [], image_skeletons: [], box_updates: [] };
    }
    console.log(`Inferred ${inferred.length} prompt(s) from text inside boxes.`);
    pairs = inferred;
  }

  // hard limit
  if (pairs.length > MAX_IMAGES) pairs = pairs.slice(0, MAX_IMAGES);

  const results: GenerateResult[] = [];
  const image_skeletons: ImageSkeleton[] = [];

  // Placement defaults (keep these once, outside the loop)
  const PADDING = 12;
  const DEFAULT_SIZE = 128;

  // Track how much each box needs to grow (use max needed across multiple icons)
  const boxGrowMap = new Map<string, { width?: number; height: number }>();

  for (const { el, prompt, box } of pairs) {
    console.log(`Generating: "${prompt}"`);

    let b64: string | null = null;

    try {
      b64 = await imagenGeneratePngB64(ai, prompt);
    } catch (err: any) {
      const base = extractBaseLabelFromPrompt(prompt);
      if (looksUnsafe(base)) {
        const fallbackPrompt = toSafeFallback(base);
        console.warn(`⚠️  Prompt blocked. Retrying with fallback: "${fallbackPrompt}"`);
        try {
          b64 = await imagenGeneratePngB64(ai, fallbackPrompt);
        } catch (err2) {
          console.error(`❌  Fallback also failed for "${base}":`, err2);
          continue; // skip this one
        }
      } else {
        console.error(`❌  Generation failed for "${prompt}":`, err);
        continue;
      }
    }

    if (!b64) continue;
    const buf = Buffer.from(b64, "base64");
    if (!isPng(buf)) {
      console.error("Returned data is not a PNG, skipping.");
      continue;
    }

    const transparent = knockOutAllNearWhite(buf, { threshold: 245, feather: 12 });

    const name = safeFilename(prompt);
    const fpath = path.join(OUTPUT_DIR, `${name}.png`);
    fs.writeFileSync(fpath, transparent);

    results.push({
      elementId: el.id,
      prompt,
      file: fpath,
      dataURL: toDataUrlPng(transparent.toString("base64")),
    });

    // --- centered-inside-box placement, under the text when possible ---
    const fileId = `file-${el.id ?? crypto.randomUUID()}`;
    let imgW = DEFAULT_SIZE;
    let imgH = DEFAULT_SIZE;
    let imgX: number;
    let imgY: number;

    if (box) {
      const bx = box.x ?? 0;
      const by = box.y ?? 0;
      const bw = Math.max(0, box.width ?? 0);
      const bh = Math.max(0, box.height ?? 0);

      const maxW = Math.max(0, bw - 2 * PADDING);
      const maxH = Math.max(0, bh - 2 * PADDING);
      const target = Math.min(DEFAULT_SIZE, maxW, maxH);
      imgW = Math.max(24, target);
      imgH = imgW;

      const ty = el.y ?? by;
      const th = Math.max(0, el.height ?? 0);

      // try below the text inside current box bounds
      let desiredX = bx + (bw - imgW) / 2;
      let desiredY = ty + th + PADDING;

      // How much would we overflow the bottom?
      const bottomLimit = by + bh - PADDING;
      let expandBy = Math.max(0, desiredY + imgH - bottomLimit);

      if (expandBy > 0 && box.id) {
        // Remember the maximum expansion needed per box (height only)
        const prev = boxGrowMap.get(box.id) || { height: 0 };
        if (expandBy > prev.height) boxGrowMap.set(box.id, { height: expandBy });
      }

      // Use the virtually-expanded bottom when placing the icon so preview looks right
      const virtualBottom = bottomLimit + (expandBy || 0);

      // clamp horizontally to current box width (we're not expanding width here)
      imgX = Math.min(Math.max(desiredX, bx + PADDING), bx + bw - PADDING - imgW);

      // clamp vertically to the *virtual* (expanded) height so it appears inside
      imgY = Math.min(Math.max(desiredY, by + PADDING), virtualBottom - imgH);
    } else {
      // fallback if no box (e.g., explicit tags)
      const baseX = el.x ?? 0;
      const baseY = el.y ?? 0;
      const th = Math.max(0, el.height ?? 0);
      imgX = baseX + 12;
      imgY = baseY + th + 12;
    }

    image_skeletons.push({
      type: "image",
      x: imgX,
      y: imgY,
      width: imgW,
      height: imgH,
      fileId,
    });
  }

  // Build box_updates array (actual resize instructions)
  const box_updates: Array<{ id: string; width?: number; height: number }> = [];
  for (const [id, grow] of boxGrowMap) {
    box_updates.push({ id, height: grow.height });
  }

  return { results, image_skeletons, box_updates };
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
    { type: "arrow", id: "a1", x: 300, y: 140, width: 120, height: 0 },
    { type: "text", id: "t-free", x: 450, y: 160, width: 100, height: 20, text: "Floating label" },
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
