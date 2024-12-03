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
                    agent: { connect: { id: userId } }
                },
                include: { ticket: true }
            })

            if (!newComment.ticket) throw new NotFoundException('The ticket was not found')

            return newComment
        } catch(err) {
            console.log('problem with the comment', err)
            throw new InternalServerErrorException('There was a server error and could not add the recent comment')
        }
    }
}
