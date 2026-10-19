import path from 'node:path';
import multer from 'multer';

const PDF_MIME_TYPE = 'application/pdf';
const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const isPdf = extension === '.pdf' && file.mimetype === PDF_MIME_TYPE;
    const isDocx = extension === '.docx' && file.mimetype === DOCX_MIME_TYPE;

    if (!isPdf && !isDocx) {
      callback(new Error('Unsupported_Media_Type'));
      return;
    }
    callback(null, true);
  },
});
