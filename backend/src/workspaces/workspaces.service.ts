import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { documents, workspaces } from '../db/schema.js';
import { and, eq } from 'drizzle-orm';
import { CreateWorkspaceDto } from './dto/create-workspace.dto.js';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto.js';

@Injectable()
export class WorkspacesService {
  constructor(private readonly databaseService: DatabaseService) {}
  async create(data: CreateWorkspaceDto, userId: string) {
    const [workspace] = await this.databaseService.db
      .insert(workspaces)
      .values({
        name: data.name.trim(),
        description: data.description?.trim() || null,
        userId,
      })
      .returning();
    return workspace;
  }

  async findAll(userId: string) {
    return this.databaseService.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.userId, userId));
  }

  async findById(id: string, userId: string) {
    const [workspace] = await this.databaseService.db
      .select()
      .from(workspaces)
      .where(and(eq(workspaces.id, id), eq(workspaces.userId, userId)));

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    return workspace;
  }

  async update(id: string, data: UpdateWorkspaceDto, userId: string) {
    if (data.name === undefined && data.description === undefined) {
      throw new BadRequestException('No fields to update');
    }

    const [workspace] = await this.databaseService.db
      .update(workspaces)
      .set({
        ...(data.name !== undefined && {
          name: data.name,
        }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        updatedAt: new Date(),
      })
      .where(and(eq(workspaces.id, id), eq(workspaces.userId, userId)))
      .returning();
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    return workspace;
  }

  async delete(id: string, userId: string) {
    await this.findById(id, userId);

    const [document] = await this.databaseService.db
      .select({ id: documents.id })
      .from(documents)
      .where(and(eq(documents.workspaceId, id), eq(documents.userId, userId)))
      .limit(1);

    if (document) {
      throw new ConflictException(
        'Workspace contains documents. Delete documents first.',
      );
    }

    try {
      const [deleted] = await this.databaseService.db
        .delete(workspaces)
        .where(and(eq(workspaces.id, id), eq(workspaces.userId, userId)))
        .returning();

      if (!deleted) {
        throw new NotFoundException('Workspace not found');
      }

      return deleted;
    } catch (error: unknown) {
      const dbError = error as {
        code?: string;
        cause?: { code?: string };
      };

      if (dbError.code === '23503' || dbError.cause?.code === '23503') {
        throw new ConflictException(
          'Workspace contains documents. Delete documents first.',
        );
      }

      throw error;
    }
  }

  async findDocuments(id: string, userId: string) {
    await this.findById(id, userId);

    return this.databaseService.db
      .select({
        id: documents.id,
        title: documents.title,
        status: documents.status,
        originalFileName: documents.originalFileName,
        mimeType: documents.mimeType,
        fileSize: documents.fileSize,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
      })
      .from(documents)
      .where(and(eq(documents.workspaceId, id), eq(documents.userId, userId)));
  }
}
