import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { comment } from '@prisma/client';
import prisma from 'prisma/prisma_Client';
import { isUUID } from 'class-validator';

@Injectable()
export class CommentsService {
    constructor() {}

    public async AddComment(content: string, ticketId: string, userId: string): Promise<comment> {
        const agentId = userId

        if (!agentId) throw new UnauthorizedException('User was not found')

        if (!isUUID(ticketId)) throw new BadRequestException('Invalid ticket ID format');
        if (!isUUID(agentId)) throw new BadRequestException('Invalid user-agent ID format');
            
        try {
            const newComment = await prisma.comment.create({
                data: { 
                    content: content,
                    ticket: { connect: { id: ticketId } },
                    user: { connect: { id: userId } }
                },
                select: {
                    user: {
                        select: {
                            id: true,
                            userEmail: true,
                            userName: true,
                            last_logged_at: true
                        }
                    },
                    ticket: true,
                    id: true,  
                    content: true,  
                    created_at: true,  
                    ticketId: true,
                    userId: true
                }
            })

            if (!newComment.ticket.id) throw new NotFoundException('The ticket was not found')

            return newComment
        } catch(err) {
            console.log('problem with the comment', err)
            throw new InternalServerErrorException('There was a server error and could not add the recent comment')
        }
    }
}
