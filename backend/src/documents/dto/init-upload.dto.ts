import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class InitUploadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @IsIn([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ])
  mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(10 * 1024 * 1024)
  fileSize!: number;

  @IsUUID('4')
  workspaceId!: string;
}
