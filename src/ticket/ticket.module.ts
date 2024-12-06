import { Module } from '@nestjs/common';
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
import { AssignTicketsByCatsToEngService } from './provider/assign-tickets-by-cats-to-eng.service';

@Module({
  imports: [CommentsModule, CategoryModule, CustomerModule, EngineerModule, ConfigModule.forFeature(authConfig), JwtModule.registerAsync(authConfig.asProvider())],
  controllers: [TicketController],
  providers: [TicketService, MetricsService, DependentTicketService, GenerateCustomTicketIdService, AssignTicketsByCatsToEngService],
  exports: [TicketService]
})
export class TicketModule {}
