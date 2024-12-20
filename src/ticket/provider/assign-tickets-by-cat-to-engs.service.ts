import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import prisma from 'prisma/prisma_Client';
import { PriorityLevel } from '../enum/priority.enum';
import { Categories } from 'src/category/enums/categories.enum';

@Injectable()
export class AssignTicketsByCatToEngsService {
    public async assignTicketsByCatToEngs(priority: PriorityLevel, categoryName: Categories, ticketId: string) {
        if (!categoryName) throw new BadRequestException(`Category with name "${categoryName}" does not exist.`)
            
        try {
            const requiredEngineers = (() => {
                switch (priority)  {
                    case PriorityLevel.LOW: return 0;
                    case PriorityLevel.MEDIUM: return 0;
                    case PriorityLevel.HIGH: return 1;
                    case PriorityLevel.URGENT: return 2;
                    default: return 0;
                }
            })()

            if (priority === PriorityLevel.LOW || priority === PriorityLevel.MEDIUM) {
                console.log('No engineers needed to get assigned right away')
                return;
            }
            
            const categoryToBeAssigned = await prisma.category.findUnique({ 
                where: { categoryName: categoryName }
            })
            
            const engineersByCategory = await prisma.engineer.findMany({
                where: { categoryId: categoryToBeAssigned.id },
                include: {
                    asUser: {
                        select: {
                            userName: true,
                            userEmail: true
                        }
                    }
                }
            })
            
            if (engineersByCategory.length === 0) throw new NotFoundException(`No engineers found for the category '${categoryName}'.`);

            const availableEngineers = await this.getAvailableEngineers(categoryName)

            if (availableEngineers.length >= requiredEngineers) {
                const engineersToGetAssigned = availableEngineers.slice(0, requiredEngineers)
                
                console.log(`${engineersToGetAssigned.length} engineers were assigned to ticket: ${ticketId}`)
                return engineersToGetAssigned
            } else {
                console.log(`There were not enough engineers to assign, needed ${requiredEngineers}, returned ${engineersByCategory.length}`)
                return engineersByCategory
            }

        } catch (err) {
            if (err instanceof NotFoundException) {
                console.log('Engineers were not found by category', err.message)
                throw err
            }
            console.log('error με τους engineers για τα tickets μεσω categories.')
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
                    asUser: {
                        select: {
                            userName: true,
                            userEmail: true
                        }
                    }
                }
            })

            const assignedEngineers = await prisma.assigned_engineers.findMany({
                where: {
                    engineerId: { in: engineersByCategory.map(engineer => engineer.engineerId) } 
                }
            })
            console.log('Assigned Engineers:', assignedEngineers);

            const assignedEngsIds = new Set(assignedEngineers.map(engineer => engineer.engineerId))

            const availableEngineers = engineersByCategory.map(engineer => engineer.engineerId).filter(engineerId => !assignedEngsIds.has(engineerId))
            console.log('Available Engineers:', availableEngineers);

            const engineersToBeAssigned = await prisma.engineer.findMany({
                where: { engineerId: { in: availableEngineers }}
            })
            console.log('Engineers to be assigned:', engineersToBeAssigned);

            return engineersToBeAssigned
        } catch (err) {
            console.log('error fetching available engineers', err);
            throw new InternalServerErrorException('Could not fetch available engineers.');
        }
    }
}
