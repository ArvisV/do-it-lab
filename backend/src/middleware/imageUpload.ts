
import multer from "multer";
import type { Request, Response, NextFunction } from "express";

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024, // Maksimums 5 MB
    files: 1,
  },

  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      callback(
        new Error("Atļauti tikai JPG, PNG un WEBP attēli."),
      );
      return;
    }

    callback(null, true);
  },
});

// Viena attēla augšupielāde ar kļūdu apstrādi.
export function uploadSingleImage(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  upload.single("image")(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({
          message: "Attēla izmērs nedrīkst pārsniegt 5 MB.",
        });
        return;
      }

      if (error.code === "LIMIT_UNEXPECTED_FILE") {
        res.status(400).json({
          message: "Atļauts augšupielādēt tikai vienu attēlu.",
        });
        return;
      }

      res.status(400).json({
        message: "Neizdevās augšupielādēt attēlu.",
      });
      return;
    }

    if (error) {
      res.status(400).json({
        message: error.message || "Nederīgs attēla fails.",
      });
      return;
    }

    next();
  });
}
