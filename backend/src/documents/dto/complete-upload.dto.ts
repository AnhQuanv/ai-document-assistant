import { IsUUID } from 'class-validator';

export class CompleteUploadDto {
  @IsUUID('4')
  documentId!: string;
}
