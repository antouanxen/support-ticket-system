import { forwardRef, Module } from '@nestjs/common';
import { CommentsService } from './provider/comments.service';
import { TicketModule } from 'src/ticket/ticket.module';

@Module({
  imports: [forwardRef(() => TicketModule)],
  controllers: [],
  providers: [CommentsService],
  exports: [CommentsService]
})
export class CommentsModule {}
