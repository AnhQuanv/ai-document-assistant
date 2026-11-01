import { Injectable, UnsupportedMediaTypeException } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';

@Injectable()
export class DocumentTextExtractorService {
  async extract(buffer: Buffer, mimeType: string): Promise<string> {
    switch (mimeType) {
      case 'application/pdf':
        return this.extractPdf(buffer);

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return this.extractDocx(buffer);

      default:
        throw new UnsupportedMediaTypeException('Unsupported document type');
    }
  }

  private async extractPdf(buffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: buffer });

    try {
      const result = await parser.getText();

      return result.text.trim();
    } finally {
      await parser.destroy();
    }
  }

  private async extractDocx(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer });

    return result.value.trim();
  }
}
