import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { WorkspacesService } from './workspaces.service.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard.js';
import { CreateWorkspaceDto } from './dto/create-workspace.dto.js';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  create(
    @Body() data: CreateWorkspaceDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.workspacesService.create(data, request.user!.userId);
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.workspacesService.findAll(request.user!.userId);
  }

  @Get(':id')
  findById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.workspacesService.findById(id, request.user!.userId);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() data: UpdateWorkspaceDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.workspacesService.update(id, data, request.user!.userId);
  }

  @Delete(':id')
  remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.workspacesService.delete(id, request.user!.userId);
  }

  @Get(':id/documents')
  findDocuments(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.workspacesService.findDocuments(id, request.user!.userId);
  }
}
