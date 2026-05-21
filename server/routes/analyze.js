import express from "express";
import multer from "multer";
import { analyzeRaee } from "../services/visionAnalyzer.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 6 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(Object.assign(new Error("Solo se aceptan archivos de imagen."), { status: 415 }));
      return;
    }

    cb(null, true);
  },
});

router.post("/analyze-image", upload.single("image"), async (req, res, next) => {
  try {
    const description = normalizeDescription(req.body?.description);

    if (!req.file && !description) {
      const error = new Error("Subí una imagen o escribí una descripción para analizar.");
      error.status = 400;
      throw error;
    }

    const analysis = await analyzeRaee({
      file: req.file
        ? {
            buffer: req.file.buffer,
            mimetype: req.file.mimetype,
            originalName: req.file.originalname,
            size: req.file.size,
          }
        : null,
      description,
    });

    res.status(200).json({
      ok: true,
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
});

function normalizeDescription(value) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 1200);
}

export default router;
