import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10;

export interface UploadedFile {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
}

export function createUploadRoutes(uploadDir: string): Router {
  const router = Router();

  // Ensure upload directory exists
  fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const id = crypto.randomUUID();
      const ext = path.extname(file.originalname);
      cb(null, `${id}${ext}`);
    },
  });

  const upload = multer({
    storage,
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: MAX_FILES,
    },
  });

  router.post('/', upload.array('files', MAX_FILES), (req, res) => {
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files provided' });
      return;
    }

    const result: UploadedFile[] = files.map((f) => ({
      id: path.basename(f.filename, path.extname(f.filename)),
      originalName: f.originalname,
      mimeType: f.mimetype,
      size: f.size,
      path: f.path,
    }));

    res.json({ files: result });
  });

  // Error handling for multer
  router.use((err: any, _req: any, res: any, next: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ error: 'File too large. Maximum size is 10MB.' });
        return;
      }
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  });

  return router;
}
