import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';
import { DatabaseService } from '../db/database.service.js';
import { documents } from '../db/schema.js';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { StorageService } from '../storage/storage.service.js';
import { InitUploadDto } from './dto/init-upload.dto.js';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly storageService: StorageService,
  ) {}

  async findAll(userId: string) {
    return this.databaseService.db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId));
  }

  async findById(id: string, userId: string) {
    const result = await this.databaseService.db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, userId)));

    const document = result[0];

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async create(data: CreateDocumentDto, userId: string) {
    const result = await this.databaseService.db
      .insert(documents)
      .values({ title: data.title, status: 'pending', userId })
      .returning();

    return result[0];
  }

  async update(id: string, data: UpdateDocumentDto, userId: string) {
    const [document] = await this.databaseService.db
      .update(documents)
      .set({
        title: data.title,
        updatedAt: new Date(),
      })
      .where(and(eq(documents.id, id), eq(documents.userId, userId)))
      .returning();

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async initUpload(data: InitUploadDto, userId: string) {
    const extension = data.mimeType === 'application/pdf' ? '.pdf' : '.docx';
    if (!data.fileName.toLowerCase().endsWith(extension)) {
      throw new BadRequestException('File extension does not match MIME type');
    }

    const storageKey = `documents/${randomUUID()}${extension}`;
    const [document] = await this.databaseService.db
      .insert(documents)
      .values({
        title: data.fileName,
        status: 'pending',
        originalFileName: data.fileName,
        storageKey,
        mimeType: data.mimeType,
        fileSize: data.fileSize,
        userId,
      })
      .returning();

    const uploadUrl = await this.storageService.createUploadUrl(
      storageKey,
      data.mimeType,
    );

    return {
      documentId: document.id,
      uploadUrl,
      expiresIn: 300,
    };
  }

  async completeUpload(id: string, userId: string) {
    const document = await this.findById(id, userId);

    if (document.status === 'uploaded' && document.storageKey) {
      return document;
    }

    if (document.status !== 'pending' || !document.storageKey) {
      throw new BadRequestException('Invalid upload state');
    }
    const fileInfo = await this.storageService.getFileInfo(document.storageKey);

    if (
      fileInfo.size !== document.fileSize ||
      fileInfo.mimeType !== document.mimeType
    ) {
      throw new BadRequestException('Uploaded file metadata mismatch');
    }

    const [updated] = await this.databaseService.db
      .update(documents)
      .set({
        status: 'uploaded',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(documents.id, id),
          eq(documents.userId, userId),
          eq(documents.status, 'pending'),
        ),
      )
      .returning();

    if (!updated) {
      throw new BadRequestException('Document upload state has changed');
    }

    return updated;
  }

  async getDownloadUrl(id: string, userId: string) {
    const document = await this.findById(id, userId);
    if (document.status !== 'uploaded') {
      throw new BadRequestException('Document is not ready for download');
    }
    if (!document.storageKey) {
      throw new BadRequestException('Document has no storage key');
    }
    const downloadUrl = await this.storageService.createDownloadUrl(
      document.storageKey,
    );
    return {
      documentId: document.id,
      fileName: document.originalFileName,
      downloadUrl,
      expiresIn: 300,
    };
  }

  async delete(id: string, userId: string) {
    const document = await this.findById(id, userId);
    if (document.storageKey) {
      await this.storageService.deleteFile(document.storageKey);
    }
    const [deleted] = await this.databaseService.db
      .delete(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, userId)))
      .returning();

    if (!deleted) {
      throw new NotFoundException('Document not found');
    }

    return deleted;
  }
}
