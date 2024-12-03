import { Module } from '@nestjs/common';
import { EngineerController } from './engineer.controller';
import { EngineerService } from './provider/engineer.service';
import { EngineerTicketsService } from './provider/engineer-tickets.service';

@Module({
  imports: [],
  controllers: [EngineerController],
  providers: [EngineerService, EngineerTicketsService],
  exports: [EngineerService]
})
export class EngineerModule {}
