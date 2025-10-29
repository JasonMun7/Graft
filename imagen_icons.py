#working Imagen starter code 

# from google import genai
# from google.genai import types
# from PIL import Image
# from io import BytesIO
# import base64

# # 🔑 Create client (reads GOOGLE_API_KEY from env, or pass api_key="...")
# client = genai.Client(api_key="AIzaSyAkBxYdEqu9n72z-BAyjnQB7R32ZMqN-IY")

# # ---- Helper ----
# PNG_MAGIC = b"\x89PNG\r\n\x1a\n"

# def ensure_binary_png(b: bytes) -> bytes:
#     """Return real PNG bytes; decode if the input is base64 text."""
#     if not isinstance(b, (bytes, bytearray)):
#         b = str(b).encode("utf-8", errors="ignore")
#     if b.startswith(PNG_MAGIC):
#         return bytes(b)
#     try:
#         decoded = base64.b64decode(b, validate=True)
#         if decoded.startswith(PNG_MAGIC):
#             return decoded
#     except Exception:
#         pass
#     try:
#         decoded = base64.b64decode(b)
#         if decoded.startswith(PNG_MAGIC):
#             return decoded
#     except Exception:
#         pass
#     return bytes(b)

# # ---- Generate Image ----
# response = client.models.generate_images(
#     model="imagen-4.0-generate-001",
#     prompt="A robot holding a red skateboard",
#     config=types.GenerateImagesConfig(
#         number_of_images=1,
#         aspect_ratio="1:1",
#         output_mime_type="image/png"
#     )
# )

# gen_img = response.generated_images[0].image

# # Grab bytes or base64 depending on SDK
# raw_bytes = getattr(gen_img, "image_bytes", None)
# if raw_bytes is None and getattr(gen_img, "bytes_base64", None):
#     raw_bytes = gen_img.bytes_base64

# # Normalize to real PNG bytes
# if isinstance(raw_bytes, str):
#     raw_bytes = raw_bytes.encode("utf-8")
# png_bytes = ensure_binary_png(raw_bytes)

# # ---- Load with Pillow ----
# pil_img = Image.open(BytesIO(png_bytes))
# pil_img.load()
# pil_img.show()
# pil_img.save("robot.png")

# print("✅ Saved robot.png")



#excalidraw attempt 1

# excalidraw_imagen_bridge.py
# Create images from prompts embedded in an Excalidraw scene (text elements like [[img: prompt]])
# Output:
#   - PNG files saved to ./gen_images/<safe_name>.png
#   - results list: [{"elementId", "prompt", "file", "dataURL"}]
#   - image element skeletons to place back into Excalidraw

from google import genai
from google.genai import types
from PIL import Image as PILImage
from io import BytesIO
from pathlib import Path
import base64, os, re, json, time

# =========================
# CONFIG
# =========================
API_KEY = os.getenv("GOOGLE_API_KEY") or "AIzaSyAkBxYdEqu9n72z-BAyjnQB7R32ZMqN-IY"  # <-- replace or set env var
MODEL = "imagen-4.0-generate-001"
ASPECT_RATIO = "1:1"
OUTPUT_DIR = Path("gen_images")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# =========================
# HELPERS
# =========================
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"

def ensure_binary_png(b: bytes) -> bytes:
    """Return real PNG bytes; decode if the input is base64 text."""
    if not isinstance(b, (bytes, bytearray)):
        b = str(b).encode("utf-8", errors="ignore")
    if b.startswith(PNG_MAGIC):
        return bytes(b)
    for strict in (True, False):
        try:
            decoded = base64.b64decode(b, validate=strict)
            if decoded.startswith(PNG_MAGIC):
                return decoded
        except Exception:
            pass
    return bytes(b)  # may fail later if not a real PNG

def to_data_url(png_bytes: bytes) -> str:
    return "data:image/png;base64," + base64.b64encode(png_bytes).decode("ascii")

def safe_filename(s: str) -> str:
    return "".join(c for c in s if c.isalnum() or c in ("-", "_", " ")).strip().replace(" ", "_")

def imagen_generate_png_bytes(client, prompt: str) -> bytes:
    resp = client.models.generate_images(
        model=MODEL,
        prompt=prompt,
        config=types.GenerateImagesConfig(
            number_of_images=1,
            aspect_ratio=ASPECT_RATIO,
            output_mime_type="image/png",
        ),
    )
    img_obj = resp.generated_images[0].image
    raw = getattr(img_obj, "image_bytes", None)
    if raw is None and getattr(img_obj, "bytes_base64", None):
        raw = img_obj.bytes_base64
        if isinstance(raw, str):
            raw = raw.encode("utf-8")
    png_bytes = ensure_binary_png(raw)
    # Sanity check: let Pillow parse it once
    PILImage.open(BytesIO(png_bytes)).load()
    return png_bytes

# =========================
# EXTRACT PROMPTS FROM EXCALIDRAW
# We’ll look for text elements with [[img: prompt here]]
# =========================
IMG_TAG_RE = re.compile(r"\[\[\s*img\s*:\s*(.+?)\s*\]\]", re.IGNORECASE)

def extract_img_prompts(excal: dict):
    """
    Find text elements containing [[img: ...]].
    Returns list of (element, prompt_str).
    """
    elements = excal.get("elements", []) or []
    found = []
    for el in elements:
        if el.get("type") == "text":
            text = el.get("text", "")
            m = IMG_TAG_RE.search(text or "")
            if m:
                prompt = m.group(1).strip()
                if prompt:
                    found.append((el, prompt))
    return found

# =========================
# MAIN DRIVER: from Excalidraw -> Images
# =========================
def generate_images_from_excalidraw(excal: dict):
    """
    Returns:
      results: [{"elementId","prompt","file","dataURL"}]
      image_skeletons: list of ExcalidrawElementSkeletons of type "image"
                       (you can convert with convertToExcalidrawElements on the JS side)
    """
    t0 = time.time()
    client = genai.Client(api_key=API_KEY)

    tagged = extract_img_prompts(excal)
    if not tagged:
        print("No [[img: ...]] prompts found in the Excalidraw scene.")
        client.close()
        return [], []

    results = []
    image_skeletons = []

    for el, prompt in tagged:
        print(f"Generating: {prompt!r}")
        png_bytes = imagen_generate_png_bytes(client, prompt)
        data_url = to_data_url(png_bytes)

        # save to file
        name = safe_filename(prompt) or "image"
        fpath = OUTPUT_DIR / f"{name}.png"
        with open(fpath, "wb") as f:
            f.write(png_bytes)

        results.append({
            "elementId": el.get("id"),
            "prompt": prompt,
            "file": str(fpath),
            "dataURL": data_url,
        })

        # OPTIONAL: create an image element skeleton near the text element position
        # Excalidraw "image" skeleton minimal fields: type, x, y, width, height, fileId
        # Note: you must also supply the "files" map (dataURL) when adding to the scene.
        # Here we only prepare the skeleton and a matching fileId you can wire in JS.
        file_id = f"file-{el.get('id','noid')}"
        image_skeletons.append({
            "type": "image",
            "x": el.get("x", 0),
            "y": el.get("y", 0),
            "width": 256,
            "height": 256,
            "fileId": file_id,
            # You will attach files[file_id] = { mimeType, id, dataURL } on the JS side.
        })

    client.close()
    print(f"Done in {time.time() - t0:.1f}s")
    return results, image_skeletons

# =========================
# MOCK EXCALIDRAW CONTEXT 
# =========================
EXCALIDRAW_CONTEXT = {
    "type": "excalidraw",
    "version": 2,
    "source": "excalidraw",
    "elements": [
        {"type": "text", "id": "t1", "x": 100, "y": 80,  "text": "[[img: bar chart icon minimal]]"},
        {"type": "text", "id": "t2", "x": 350, "y": 120, "text": "[[img: calendar icon outline]]"},
        {"type": "text", "id": "t3", "x": 600, "y": 160, "text": "[[img: graduation cap icon]]"},
        # regular shapes (ignored for image prompts)
        {"type": "rectangle", "x": 80, "y": 200, "width": 200, "height": 100},
    ],
    "appState": {"viewBackgroundColor": "#ffffff"},
}

# =========================
# RUN
# =========================
if __name__ == "__main__":
    results, image_skeletons = generate_images_from_excalidraw(EXCALIDRAW_CONTEXT)

    # Pretty print a small summary
    print("\nGenerated images:")
    for r in results:
        print(f" - {r['prompt']} -> {r['file']}")

    print("\nImage element skeletons (for convertToExcalidrawElements on the JS side):")
    print(json.dumps(image_skeletons, indent=2))
