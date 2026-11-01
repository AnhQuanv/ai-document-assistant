import { Module } from '@nestjs/common';
import { DocumentTextExtractorService } from './document-text-extractor.service.js';
import { DocumentProcessingService } from './document-processing.service.js';
import { DatabaseModule } from '../db/database.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { DocumentChunkingService } from './document-chunking.service.js';

@Module({
  imports: [DatabaseModule, StorageModule],
  providers: [
    DocumentTextExtractorService,
    DocumentProcessingService,
    DocumentChunkingService,
  ],
  exports: [DocumentTextExtractorService, DocumentProcessingService],
})
export class DocumentProcessingModule {}
