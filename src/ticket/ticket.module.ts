import { forwardRef, Module } from '@nestjs/common';
import { TicketController } from './ticket.controller';
import { TicketService } from './provider/ticket.service';
import { MetricsService } from './provider/metrics.service';
import { CommentsModule } from 'src/comments/comments.module';
import { CategoryModule } from 'src/category/category.module';
import { CustomerModule } from 'src/customer/customer.module';
import { ConfigModule } from '@nestjs/config';
import authConfig from 'src/authentication/config/authConfig';
import { JwtModule } from '@nestjs/jwt';
import { EngineerModule } from 'src/engineer/engineer.module';
import { DependentTicketService } from './provider/dependent-ticket.service';
import { GenerateCustomTicketIdService } from './provider/generate-custom-ticket-id.service';
import { AssignTicketsByCatToEngsService } from './provider/assign-tickets-by-cat-to-engs.service';

@Module({
  imports: [CommentsModule, CategoryModule, CustomerModule, forwardRef(() => EngineerModule), ConfigModule.forFeature(authConfig), JwtModule.registerAsync(authConfig.asProvider())],
  controllers: [TicketController],
  providers: [TicketService, MetricsService, DependentTicketService, GenerateCustomTicketIdService, AssignTicketsByCatToEngsService],
  exports: [TicketService]
})
export class TicketModule {}
