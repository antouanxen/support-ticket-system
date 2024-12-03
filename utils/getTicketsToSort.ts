import { ticket } from "@prisma/client";
import { SortTicketsDto } from "src/ticket/dtos/sort-tickets.dto";

export async function getTicketsToSort(sortTicketsDto: SortTicketsDto, tickets: ticket[]): Promise<ticket[] | undefined> {
    let { orderBy, direction } = sortTicketsDto
    
    if (tickets && tickets.length > 0) {
        const sortBy = orderBy || 'created_at';  
        const shouldSort = sortBy && direction;

        if (shouldSort) {
            console.log('Sorting options for tickets:', orderBy, 'and', direction)
            tickets.sort((a, b) => {
                let result = 0

                if (orderBy) {
                    const aValue = a[sortBy]
                    const bValue = b[sortBy]

                    if (typeof aValue === 'string' && typeof bValue === 'string') {
                        result = aValue.localeCompare(bValue);
                    } else if (aValue instanceof Date && bValue instanceof Date) {
                        result = aValue.getTime() - bValue.getTime();
                    }

                    return direction === 'ASC' ? result : -result
                } else if (!orderBy) {
                    orderBy = 'created_at'
                }
            })
            console.log('Tickets after sorting:', tickets.length)

            return tickets
        } else {
            console.log('No tickets got any sorting')
            return []
        }
    } else return []
}