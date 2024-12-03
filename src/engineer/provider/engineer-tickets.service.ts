import { Injectable, NotFoundException } from '@nestjs/common';
import prisma from 'prisma/prisma_Client';
import { Status } from 'src/ticket/enum/status.enum';

@Injectable()
export class EngineerTicketsService {
    constructor() {}

    public async getEngineerTicket(newTicket_id: string, engineer_id: string) {
        const engineerExists = await prisma.engineer.findUnique({
            where: { engineer_id: engineer_id }
        });
    
        if (!engineerExists) throw new NotFoundException('Engineer not found.');
    
        await prisma.engineer_tickets.create({ 
            data: {
                ticketId: newTicket_id,
                engineerId: engineer_id
            }
        })

        await prisma.ticket.update({ 
            where: { id: newTicket_id },
            data: { status: Status.IN_PROGRESS } 
        })

        console.log('Φτιαχτηκε μια σχεση μεταξυ engineer και ticket και ενημερωθηκε το status σε in-progress')
    }
}
