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

@Injectable()
export class DocumentsService {
  constructor(private readonly databaseService: DatabaseService) {}

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
}
