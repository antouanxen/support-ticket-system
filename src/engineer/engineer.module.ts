import { forwardRef, Module } from '@nestjs/common';
import { EngineerController } from './engineer.controller';
import { EngineerService } from './provider/engineer.service';
import { EngineerTicketsService } from './provider/engineer-tickets.service';
import { CategoryModule } from 'src/category/category.module';
import { TicketModule } from 'src/ticket/ticket.module';

@Module({
  imports: [CategoryModule,  forwardRef(() => TicketModule)],
  controllers: [EngineerController],
  providers: [EngineerService, EngineerTicketsService],
  exports: [EngineerService]
})
export class EngineerModule {}
