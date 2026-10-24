import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';
import { DatabaseService } from '../db/database.service.js';
import { documents } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { StorageService } from '../storage/storage.service.js';
import { InitUploadDto } from './dto/init-upload.dto.js';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly storageService: StorageService,
  ) {}

  async findAll() {
    return this.databaseService.db.select().from(documents);
  }

  async findById(id: string) {
    const result = await this.databaseService.db
      .select()
      .from(documents)
      .where(eq(documents.id, id));

    const document = result[0];

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async create(data: CreateDocumentDto) {
    const result = await this.databaseService.db
      .insert(documents)
      .values({ title: data.title, status: data.status })
      .returning();

    return result[0];
  }

  async update(id: string, data: UpdateDocumentDto) {
    if (data.title === undefined && data.status === undefined) {
      throw new BadRequestException('No fields to update');
    }
    const result = await this.databaseService.db
      .update(documents)
      .set({
        title: data.title,
        status: data.status,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, id))
      .returning();
    const document = result[0];
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    return document;
  }

  async delete(id: string) {
    const result = await this.databaseService.db
      .delete(documents)
      .where(eq(documents.id, id))
      .returning();
    const document = result[0];
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    return document;
  }

  async initUpload(data: InitUploadDto) {
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

  async completeUpload(id: string) {
    const [document] = await this.databaseService.db
      .select()
      .from(documents)
      .where(eq(documents.id, id));

    if (!document) {
      throw new NotFoundException('Document not found!');
    }

    if (document.status === 'uploaded' && document.storageKey) {
      return document;
    }

    if (document.status !== 'pending' || !document.storageKey) {
      throw new BadRequestException('Invalid upload state');
    }
    const fileInfo = await this.storageService.getFileInfo(document.storageKey);
    console.log('PostgreSQL:', {
      fileSize: document.fileSize,
      mimeType: document.mimeType,
      storageKey: document.storageKey,
    });

    console.log('SILO:', {
      fileSize: fileInfo.size,
      mimeType: fileInfo.mimeType,
    });

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
      .where(eq(documents.id, id))
      .returning();

    return updated;
  }
}
