import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from './documents.service.js';
import { DatabaseService } from '../db/database.service.js';

describe('DocumentsService', () => {
  let service: DocumentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: DatabaseService,
          useValue: { db: {} },
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
