import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { ValidationError } from '../common/errors';

const PDF_MIME_TYPE = 'application/pdf';
const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export class UnsupportedFileTypeError extends ValidationError {
  constructor() {
    super('Only PDF and DOCX files are supported.', 'Unsupported_File_Type');
  }
}

function getFileType(file: Express.Multer.File): 'pdf' | 'docx' {
  const extension = file.originalname.split('.').pop()?.toLowerCase();
  if (file.mimetype === PDF_MIME_TYPE && extension === 'pdf') return 'pdf';
  if (file.mimetype === DOCX_MIME_TYPE && extension === 'docx') return 'docx';
  throw new UnsupportedFileTypeError();
}

export const resumeParserService = {
  async extractTextFromFile(file: Express.Multer.File): Promise<string> {
    const fileType = getFileType(file);

    try {
      if (fileType === 'pdf') {
        const parser = new PDFParse({ data: file.buffer });
        try {
          const result = await parser.getText();
          return result.text;
        } finally {
          await parser.destroy();
        }
      }

      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return result.value;
    } catch {
      throw new ValidationError(
        'Unable to extract text from the uploaded file.',
        'FILE_PARSE_ERROR',
      );
    }
  },
};
