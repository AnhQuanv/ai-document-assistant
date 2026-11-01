import { BadRequestException, Injectable } from '@nestjs/common';

export interface DocumentChunk {
  chunkIndex: number;
  content: string;
}

@Injectable()
export class DocumentChunkingService {
  splitText(text: string, chunkSize = 1000, overlap = 200): DocumentChunk[] {
    if (
      !Number.isInteger(chunkSize) ||
      !Number.isInteger(overlap) ||
      chunkSize <= 0 ||
      overlap < 0 ||
      overlap >= chunkSize
    ) {
      throw new BadRequestException('Invalid chunkSize or overlap');
    }

    const normalizedText = text.replace(/\s+/g, ' ').trim();

    if (!normalizedText) {
      return [];
    }

    const chunks: DocumentChunk[] = [];
    let start = 0;

    while (start < normalizedText.length) {
      const end = Math.min(start + chunkSize, normalizedText.length);

      const content = normalizedText.slice(start, end);

      chunks.push({
        chunkIndex: chunks.length,
        content,
      });

      if (end === normalizedText.length) {
        break;
      }

      start = end - overlap;
    }

    return chunks;
  }
}
