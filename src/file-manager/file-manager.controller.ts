import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileManagerService } from './provider/file-manager.service';
import { ApiHeaders, ApiOperation } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('files')
export class FileManagerController {
    constructor(
        private readonly fileManagerService: FileManagerService
    ) {}

    @Post('file_upload')
    @ApiHeaders([
        { name: 'Content-Type', description: 'multipart/form-data'},
        { name: 'Authorization', description: 'Bearer Token'}
    ])
    @ApiOperation({ summary: 'Upload a new image to server' })
    @UseInterceptors(FileInterceptor('file'))
    public async fileUpload(@UploadedFile() file: Express.Multer.File) {
        return this.fileManagerService.fileUpload(file)
    }
}
