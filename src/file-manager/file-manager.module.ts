import { Module } from '@nestjs/common';
import { FileManagerController } from './file-manager.controller';
import { FileManagerService } from './provider/file-manager.service';

@Module({
  controllers: [FileManagerController],
  providers: [FileManagerService]
})
export class FileManagerModule {}
