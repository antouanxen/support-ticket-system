import { Injectable, NotFoundException } from '@nestjs/common';
import prisma from 'prisma/prisma_Client';

@Injectable()
export class DependentTicketService {
    constructor() {}

    public async getDependentTicket(newTicket_id: string, dependent_ticketId: string) {
        const dependentTicketExists = await prisma.ticket.findUnique({
            where: { id: dependent_ticketId }
        });
    
        if (!dependentTicketExists) throw new NotFoundException('Dependent ticket not found.');
    
        await prisma.dependent_tickets.create({ 
            data: {
                ticketId: newTicket_id,
                dependentTicketId: dependent_ticketId
            }
        })
        console.log('Φτιαχτηκε μια σχεση μεταξυ ticket')
    }
}
