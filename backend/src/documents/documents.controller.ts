import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { DocumentsService } from './documents.service.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';
import { FileInterceptor } from '@nestjs/platform-express';
import type {} from 'multer';
import { InitUploadDto } from './dto/init-upload.dto.js';
import { CompleteUploadDto } from './dto/complete-upload.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard.js';
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.documentsService.findAll(request.user!.userId);
  }

  @Get(':id')
  findById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.documentsService.findById(id, request.user!.userId);
  }

  @Post()
  create(
    @Body() body: CreateDocumentDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.documentsService.create(body, request.user!.userId);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() data: UpdateDocumentDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.documentsService.update(id, data, request.user!.userId);
  }

  @Delete(':id')
  remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.documentsService.delete(id, request.user!.userId);
  }

  @Post('uploads/init')
  initUpload(
    @Body() data: InitUploadDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.documentsService.initUpload(data, request.user!.userId);
  }

  @Post('uploads/complete')
  @HttpCode(HttpStatus.OK)
  completeUpload(
    @Body() data: CompleteUploadDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.documentsService.completeUpload(
      data.documentId,
      request.user!.userId,
    );
  }

  @Get(':id/download')
  getDownloadUrl(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.documentsService.getDownloadUrl(id, request.user!.userId);
  }
}
