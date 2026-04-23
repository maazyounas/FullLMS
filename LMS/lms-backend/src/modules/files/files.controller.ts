import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';
import { CreateUploadSignatureDto } from './dto/create-upload-signature.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { ConfigService } from '@nestjs/config';
import {
  ConfirmUploadResponseDto,
  UploadSignatureResponseDto,
} from './dto/files-response.dto';

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly configService: ConfigService,
  ) {}

  @Post('upload-signature')
  @ApiOperation({ summary: 'Create signed upload payload for Cloudinary' })
  @ApiBody({ type: CreateUploadSignatureDto })
  @ApiOkResponse({ type: UploadSignatureResponseDto })
  createUploadSignature(@Body() dto: CreateUploadSignatureDto) {
    const timestamp = Math.floor(Date.now() / 1000);
    const defaultFolder =
      this.configService.get<string>('cloudinary.uploadFolder') ?? 'lms';
    const folder = dto.folder
      ? `${defaultFolder}/${dto.folder}`
      : defaultFolder;

    const allowedFormats =
      dto.allowedFormats && dto.allowedFormats.length > 0
        ? dto.allowedFormats
        : ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

    const signaturePayload = this.cloudinaryService.createUploadSignature({
      folder,
      resourceType: dto.resourceType ?? 'raw',
      timestamp,
      publicId: dto.publicId,
    });

    return {
      data: {
        ...signaturePayload,
        allowedFormats,
      },
      meta: {
        generatedAt: new Date().toISOString(),
      },
    };
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Confirm uploaded file metadata' })
  @ApiBody({ type: ConfirmUploadDto })
  @ApiOkResponse({ type: ConfirmUploadResponseDto })
  confirmUpload(@Body() dto: ConfirmUploadDto) {
    return {
      data: {
        publicId: dto.publicId,
        resourceType: dto.resourceType,
        secureUrl: dto.secureUrl,
        format: dto.format,
        bytes: dto.bytes,
        confirmedAt: new Date().toISOString(),
      },
      meta: {
        persisted: false,
        message:
          'Upload metadata validated. Persist this payload in feature modules (assignments/profile) when integrated.',
      },
    };
  }
}
