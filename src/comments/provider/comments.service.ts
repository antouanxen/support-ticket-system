import { BadRequestException, forwardRef, Inject, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import prisma from 'prisma/prisma_Client';
import { isUUID } from 'class-validator';
import { newCommentToReturn } from '../types/newCommentToReturn.type';
import { TicketService } from 'src/ticket/provider/ticket.service';

@Injectable()
export class CommentsService {
    constructor(
        @Inject(forwardRef(() => TicketService) )
        private readonly ticketService: TicketService,
    ) {}

    public async AddComment(content: string, customTicketId: string, userId: string): Promise<newCommentToReturn> {
        const agentId = userId

        if (!agentId) throw new UnauthorizedException('User was not found')

        if (!customTicketId) throw new BadRequestException('No ticket id');
        if (!isUUID(agentId)) throw new BadRequestException('Invalid user-agent ID format');

        const ticket = await this.ticketService.getSingleTicket(customTicketId)
            
        try {
            const newComment = await prisma.comment.create({
                data: { 
                    content: content,
                    ticket: { connect: { id: ticket.id } },
                    user: { connect: { userId: userId } }
                
                },
                select: {
                    user: { select: { userName: true } },
                    id: true,  
                    content: true,  
                    ticket: { select: { customTicketId: true } },
                    created_at: true,            
                }
            })

            return {
                id: newComment.id,
                content: newComment.content,
                ticketId: newComment.ticket.customTicketId,
                userName: newComment.user.userName,
                createdAt: newComment.created_at
            }
        } catch(err) {
            console.log('problem with the comment', err)
            throw new InternalServerErrorException('There was a server error and could not add the recent comment')
        }
    }
}
