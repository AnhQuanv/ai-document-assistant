import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { StorageService } from '../storage/storage.service.js';
import { DocumentTextExtractorService } from './document-text-extractor.service.js';
import { documentChunks, documents } from '../db/schema.js';
import { and, eq, inArray } from 'drizzle-orm';
import { DocumentChunkingService } from './document-chunking.service.js';

@Injectable()
export class DocumentProcessingService {
  private readonly logger = new Logger(DocumentProcessingService.name);
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly storageService: StorageService,
    private readonly textExtractor: DocumentTextExtractorService,
    private readonly documentChunkingService: DocumentChunkingService,
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
    const document = await this.findDocumentForProcessing(documentId, userId);

    if (
      document.fileSize == null ||
      document.storageKey == null ||
      document.mimeType == null
    ) {
      throw new ConflictException('Document metadata is incomplete');
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024;

    if (document.fileSize > MAX_FILE_SIZE) {
      throw new BadRequestException('File exceeds 10 MB processing limit');
    }

    await this.claimDocument(documentId, userId);

    try {
      const buffer = await this.storageService.getObjectBuffer(
        document.storageKey,
      );

      if (buffer.length > MAX_FILE_SIZE) {
        throw new Error('Downloaded file exceeds size limit');
      }

      const extractedText = await this.textExtractor.extract(
        buffer,
        document.mimeType,
      );

      if (!extractedText.trim()) {
        throw new Error('No extractable text found');
      }

      const chunks = this.documentChunkingService.splitText(
        extractedText,
        1000,
        200,
      );

      if (chunks.length === 0) {
        throw new Error('No chunks generated');
      }

      const result = await this.databaseService.db.transaction(async (tx) => {
        // Xóa chunks cũ nếu có từ lần xử lý trước
        await tx
          .delete(documentChunks)
          .where(eq(documentChunks.documentId, documentId));

        // Chuẩn bị dữ liệu để lưu
        const chunkRecords = chunks.map((chunk) => ({
          documentId,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
        }));

        // Lưu toàn bộ chunks
        await tx.insert(documentChunks).values(chunkRecords);

        // Cập nhật document sau khi lưu chunks
        const [updated] = await tx
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
          totalChunks: chunks.length,
        };
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Document processing failed: ${documentId}`,
        error instanceof Error ? error.stack : String(error),
      );

      await this.databaseService.db
        .update(documents)
        .set({
          status: 'failed',
          processingError: 'Document processing failed',
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
