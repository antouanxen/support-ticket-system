import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import prisma from 'prisma/prisma_Client';
import { PriorityLevel } from '../enum/priority.enum';
import { Categories } from 'src/category/enums/categories.enum';

@Injectable()
export class AssignTicketsByCatsToEngService {
    public async assignTicketsByCatsToEngs(priority: PriorityLevel, categoryName: Categories, ticketId: string) {
        if (!categoryName) throw new BadRequestException(`Category with name "${categoryName}" does not exist.`)
            
        try {
            const requiredEngineers = (() => {
                switch (priority)  {
                    case PriorityLevel.LOW: return 1;
                    case PriorityLevel.MEDIUM: return 2;
                    case PriorityLevel.HIGH: return 3;
                    case PriorityLevel.URGENT: return 4;
                    default: return 1;
                }
            })()
            
            const categoryToBeAssigned = await prisma.category.findUnique({ 
                where: { categoryName: categoryName }
            })
            
            const engineersByCategory = await prisma.engineer.findMany({
                where: { categoryId: categoryToBeAssigned.id },
                include: {
                    user: {
                        select: {
                            userName: true,
                            userEmail: true
                        }
                    }
                }
            })
            
            if (engineersByCategory.length === 0) throw new NotFoundException(`No engineers found for the category "${categoryName}".`);

            const availableEngineers = await this.getAvailableEngineers(categoryName)

            if (availableEngineers.length >= requiredEngineers) {
                const engineersToGetAssigned = availableEngineers.slice(0, requiredEngineers)
                console.log(`${requiredEngineers} engineers were assigned to ${ticketId}`)
                return engineersToGetAssigned
            } else {
                console.log(`There were not enough engineers to assign, needed ${requiredEngineers}`)
                return engineersByCategory
            }

        } catch (err) {
            console.log('error για τους engineers για τα tickets μεσω categories.')
            throw new InternalServerErrorException(`An error occured while assigning engineers to tickets.`)
        }
    }

    async getAvailableEngineers(categoryName: string) {
        try {
            const categoryToBeAssigned = await prisma.category.findUnique({ 
                where: { categoryName: categoryName }
            })

            const engineersByCategory = await prisma.engineer.findMany({
                where: { categoryId: categoryToBeAssigned.id },
                include: {
                    user: {
                        select: {
                            userName: true,
                            userEmail: true
                        }
                    }
                }
            })

            const assignedEngineers = await prisma.engineer_tickets.findMany({
                where: {
                    engineerId: { in: engineersByCategory.map(engineer => engineer.engineerId) } 
                }
            })

            console.log('Assigned Engineers:', assignedEngineers);

            const assignedEngsIds = new Set(assignedEngineers.map(engineer => engineer.engineerId))

            const availableEngineers = engineersByCategory.map(engineer => engineer.engineerId).filter(engineerId => !assignedEngsIds.has(engineerId))
            console.log('Available Engineers:', availableEngineers);

            const engineersToGetAssigned = await prisma.engineer.findMany({
                where: { engineerId: { in: availableEngineers }}
            })

            console.log('Engineers to be assigned:', engineersToGetAssigned);

            return engineersToGetAssigned
        } catch (err) {
            console.log('error fetching available engineers', err);
            throw new InternalServerErrorException('Could not fetch available engineers.');
        }
    }
}
