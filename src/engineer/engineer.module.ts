import { Module } from '@nestjs/common';
import { EngineerController } from './engineer.controller';
import { EngineerService } from './provider/engineer.service';
import { EngineerTicketsService } from './provider/engineer-tickets.service';
import { CategoryModule } from 'src/category/category.module';

@Module({
  imports: [CategoryModule],
  controllers: [EngineerController],
  providers: [EngineerService, EngineerTicketsService],
  exports: [EngineerService]
})
export class EngineerModule {}
