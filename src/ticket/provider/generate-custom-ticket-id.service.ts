import { Injectable } from '@nestjs/common';
import prisma from 'prisma/prisma_Client';


@Injectable()
export class GenerateCustomTicketIdService {
    public async generateCustomTicketId(categoryName: string): Promise<string> {
       /*  const category = Object.values(Categories).find(cat => cat === categoryName)

        if (!category) throw new BadRequestException('Invalid category name') */
        const category = await prisma.category.findUnique({ where: { categoryName: categoryName} })

        let prefixForTicketCategory: string = ''

        if (category.categoryName.includes('_')) {
            const firstLetters = category.categoryName.slice(0, 2)
            const secondWordFirstLetter = category.categoryName.split('_')[1].slice(0, 1)

            prefixForTicketCategory = `${firstLetters.toUpperCase()}${secondWordFirstLetter.toUpperCase()}-` 
        } else prefixForTicketCategory = `${category.categoryName.slice(0, 2).toUpperCase()}-`

        const lastTicket = await prisma.ticket.findFirst({
            where: { category: { categoryName: category.categoryName } },
            orderBy: { created_at: 'desc' } 
        })

        const ticketNumber = lastTicket ? parseInt(lastTicket.customTicketId.replace(prefixForTicketCategory, '')) +1 : 1;

        return `${prefixForTicketCategory.toUpperCase()}${String(ticketNumber).padStart(6, '0')}`
    }
}
