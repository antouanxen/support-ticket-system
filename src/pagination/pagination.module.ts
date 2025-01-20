import { Module } from '@nestjs/common';
import { PaginationService } from './provider/pagination.service';

@Module({
  imports: [],
  providers: [PaginationService],
  exports: [PaginationService]
})
export class PaginationModule {}
