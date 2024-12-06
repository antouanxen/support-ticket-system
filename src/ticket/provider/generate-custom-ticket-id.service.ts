import { BadRequestException, Injectable } from '@nestjs/common';
import prisma from 'prisma/prisma_Client';
import { Categories } from 'src/category/enums/categories.enum';
import { CustomTicketId } from 'utils/CustomTicketId.type';

@Injectable()
export class GenerateCustomTicketIdService {
    public async generateCustomTicketId(categoryName: string): Promise<string> {
        const category = Object.values(Categories).find(cat => cat === categoryName)

        if (!category) throw new BadRequestException('Invalid category name')

        const firstLetters = CustomTicketId[category]

        const lastTicket = await prisma.ticket.findFirst({
            where: { category: { categoryName: categoryName } },
            orderBy: { created_at: 'desc' } 
        })

        const nextId = lastTicket ? parseInt(lastTicket.customTicketId.replace(firstLetters, '')) +1 : 1;

        return `${firstLetters}${String(nextId).padStart(6, '0')}`
    }
}
