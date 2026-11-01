import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';
import { DatabaseModule } from '../db/database.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { DocumentProcessingModule } from '../document-processing/document-processing.module.js';

@Module({
  imports: [
    DatabaseModule,
    StorageModule,
    AuthModule,
    DocumentProcessingModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
