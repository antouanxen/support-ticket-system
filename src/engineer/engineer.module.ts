import { forwardRef, Module } from '@nestjs/common';
import { EngineerController } from './engineer.controller';
import { EngineerService } from './provider/engineer.service';
import { EngineerTicketsService } from './provider/engineer-tickets.service';
import { CategoryModule } from 'src/category/category.module';
import { TicketModule } from 'src/ticket/ticket.module';
import { RoleModule } from 'src/role/role.module';

@Module({
  imports: [CategoryModule, RoleModule, forwardRef(() => TicketModule)],
  controllers: [EngineerController],
  providers: [EngineerService, EngineerTicketsService],
  exports: [EngineerService]
})
export class EngineerModule {}
