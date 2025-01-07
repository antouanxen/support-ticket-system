import { Injectable } from '@nestjs/common';
import prisma from 'prisma/prisma_Client';

@Injectable()
export class DependentTicketService {
    constructor() {}

    public async getDependentTicket(customId: string, dependent_ticketCustomId: string) {
        
        const dependent_ticket_relation = await prisma.dependent_tickets.create({ 
            data: {
                ticketCustomId: dependent_ticketCustomId,
                dependentTicketCustomId: customId
            }
        })

        if (dependent_ticket_relation) {
            console.log('Φτιαχτηκε μια σχεση μεταξυ ticket')
        }
    }
}
