import { Injectable, NotFoundException } from '@nestjs/common';
import prisma from 'prisma/prisma_Client';
import { Status } from 'src/ticket/enum/status.enum';

@Injectable()
export class EngineerTicketsService {
    constructor() {}

    public async getEngineerTicket(newTicketCustomId: string, engineerId: string) {
        const engineerExists = await prisma.engineer.findUnique({
            where: { engineerId: engineerId }
        });
    
        if (!engineerExists) throw new NotFoundException('Engineer not found.');
    
        await prisma.assigned_engineers.create({ 
            data: {
                ticketCustomId: newTicketCustomId,
                engineerId: engineerExists.engineerId
            }
        })

        await prisma.ticket.update({ 
            where: { customTicketId: newTicketCustomId },
            data: { status: Status.IN_PROGRESS } 
        })

        console.log('Φτιαχτηκε μια σχεση μεταξυ engineer και ticket, και ενημερωθηκε το status σε in-progress')
    }
}
