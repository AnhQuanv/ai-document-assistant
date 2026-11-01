import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { StorageService } from '../storage/storage.service.js';
import { DocumentTextExtractorService } from './document-text-extractor.service.js';
import { documents } from '../db/schema.js';
import { and, eq, inArray } from 'drizzle-orm';

@Injectable()
export class DocumentProcessingService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly storageService: StorageService,
    private readonly textExtractor: DocumentTextExtractorService,
  ) {}

  async findDocumentForProcessing(documentId: string, userId: string) {
    const [document] = await this.databaseService.db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
      .limit(1);

    if (!document) {
      throw new NotFoundException('Document not found');
    }
    return document;
  }

  private async claimDocument(documentId: string, userId: string) {
    const [document] = await this.databaseService.db
      .update(documents)
      .set({
        status: 'processing',
        processingError: null,
        extractedText: null,
        processedAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.userId, userId),
          inArray(documents.status, ['uploaded', 'failed']),
        ),
      )
      .returning();

    if (!document) {
      throw new ConflictException('Document is not ready for processing');
    }

    return document;
  }

  async process(documentId: string, userId: string) {
    // Bước 1: Tìm tài liệu và kiểm tra quyền sở hữu.
    const document = await this.findDocumentForProcessing(documentId, userId);

    if (
      document.fileSize == null ||
      document.storageKey == null ||
      document.mimeType == null
    ) {
      throw new ConflictException('Document metadata is incomplete');
    }

    // Bước 2: Kiểm tra giới hạn dung lượng trước khi tải file.
    const MAX_FILE_SIZE = 10 * 1024 * 1024;

    if (document.fileSize > MAX_FILE_SIZE) {
      throw new BadRequestException('File exceeds 10 MB processing limit');
    }

    // Bước 3: Claim Document để tránh hai request xử lý cùng lúc.
    await this.claimDocument(documentId, userId);

    try {
      // Bước 4: Tải file từ SILO.
      const buffer = await this.storageService.getObjectBuffer(
        document.storageKey,
      );

      if (buffer.length > MAX_FILE_SIZE) {
        throw new Error('Downloaded file exceeds size limit');
      }

      // Bước 5: Trích xuất văn bản.
      const extractedText = await this.textExtractor.extract(
        buffer,
        document.mimeType,
      );

      if (!extractedText.trim()) {
        throw new Error('No extractable text found');
      }

      // Bước 6: Lưu kết quả vào PostgreSQL.
      const [updated] = await this.databaseService.db
        .update(documents)
        .set({
          status: 'completed',
          extractedText,
          processingError: null,
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(documents.id, documentId),
            eq(documents.userId, userId),
            eq(documents.status, 'processing'),
          ),
        )
        .returning({ id: documents.id });

      if (!updated) {
        throw new Error('Document state changed during processing');
      }
      return {
        documentId,
        status: 'completed',
        textLength: extractedText.length,
      };
    } catch (error) {
      // Bước 7: Ghi trạng thái thất bại.
      await this.databaseService.db
        .update(documents)
        .set({
          status: 'failed',
          processingError: 'Document extraction failed',
          processedAt: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(documents.id, documentId),
            eq(documents.userId, userId),
            eq(documents.status, 'processing'),
          ),
        );

      throw new InternalServerErrorException('Document processing failed');
    }
  }
}
