import multer from "multer";
import type { Request, Response } from "express";
import { storagePut } from "./storage";
import { sdk } from "./_core/sdk";

const MAX_SIZE = 16 * 1024 * 1024; // 16 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
});

export const multerMiddleware = upload.single("file");

export async function handleFileUpload(req: Request, res: Response) {
  try {
    // Auth check
    const user = await sdk.authenticateRequest(req).catch(() => null);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: "No file provided" });

    const projectId = req.params.projectId;
    if (!projectId) return res.status(400).json({ error: "Missing projectId" });

    const randomSuffix = Math.random().toString(36).slice(2, 8);
    const safeFileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileKey = `project-files/${projectId}/${Date.now()}-${randomSuffix}-${safeFileName}`;

    const { url } = await storagePut(fileKey, file.buffer, file.mimetype);

    return res.json({
      fileUrl: url,
      fileKey,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
    });
  } catch (err) {
    console.error("[FileUpload] Error:", err);
    return res.status(500).json({ error: "Upload failed" });
  }
}
