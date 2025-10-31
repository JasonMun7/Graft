import express from "express";
import type { Request, Response } from "express"; // <-- type-only
import cors from "cors";
import bodyParser from "body-parser";
import "dotenv/config";
import { generateImagesFromExcalidraw } from "./utils/imagen"; // adjust path if needed

const app = express();
app.use(cors({ origin: "*" }));
app.use(bodyParser.json({ limit: "20mb" }));

app.post("/generate-images", async (req: Request, res: Response) => {
  try {
    const scene = req.body;
    const { results, image_skeletons } = await generateImagesFromExcalidraw(scene);

    const files: Record<string, { id: string; mimeType: string; dataURL: string }> = {};
    for (let i = 0; i < image_skeletons.length; i++) {
      const fid = image_skeletons[i].fileId;
      const r = results[i];
      files[fid] = { id: fid, mimeType: "image/png", dataURL: r.dataURL };
    }

    res.json({ files, image_skeletons });
  } catch (err: any) {
    console.error(err);
    res.status(500).send(err?.message || "Generation failed");
  }
});

app.listen(3000, () => console.log("Server on http://localhost:3000"));
