import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateEngineerDto } from '../dtos/create-engineer.dto';
import { engineer, user } from '@prisma/client';
import prisma from 'prisma/prisma_Client';
import { UpdateEngineerDto } from '../dtos/update-engineer.dto';
import { EngineerTicketsService } from './engineer-tickets.service';
import { CategoryService } from 'src/category/provider/category.service';

@Injectable()
export class EngineerService {
    constructor(
        private readonly engineerTicketsService: EngineerTicketsService,
        private readonly categoryService: CategoryService,
    ) {}

    public async createEngineer(createEngineerDto: CreateEngineerDto, userId: string): Promise<Partial<CreateEngineerDto> | { message: string }> {
        const agentId = userId

        if (!agentId) throw new NotFoundException('User does not exist')

        try {
            const existingEngineer = await prisma.user.findUnique({
                where: { userEmail: createEngineerDto.engineer_email }
            })

            if (existingEngineer) return { message: 'The email already exists for an engineer.' };

            const category = await this.categoryService.getSingleCategoryByName(createEngineerDto.category)
            
            const newEngineer = await prisma.user.create({
                data: {
                    userName: createEngineerDto.engineer_name ?? (createEngineerDto.engineer_email.split('@')[0] || 'new-user'),
                    userEmail: createEngineerDto.engineer_email,
                    userPassword: createEngineerDto.engineer_password
                }
            })

            const newEngineerWithCategory = await prisma.engineer.create({
                data: {
                    userId: newEngineer.id,
                    engineerOwnEmail: createEngineerDto.engineerOwnEmail ?? null,
                    categoryId: category.id
                }
            })

            return new CreateEngineerDto({
                engineer_name: newEngineer.userName,
                engineer_email: newEngineer.userEmail,
                engineerOwnEmail: newEngineerWithCategory.engineerOwnEmail,
                category: createEngineerDto.category
            })
        } catch(err) {
            console.log('Engineer was not created', err)
            throw new InternalServerErrorException('There was an error with the server creating the engineer. Try again')
        }
    } 

    public async findSingleEngineer(engineerId: string): Promise<engineer> {
        try {
            const singleEngineer = await prisma.engineer.findUnique({ 
                where: { userId: engineerId },
                include: { user: true }
            })

            if (!singleEngineer) throw new NotFoundException('That engineer does not exist in the database')
            
            return singleEngineer
        } catch (err) {
            console.log('Engineer was not found', err)
            throw new InternalServerErrorException('There was an error with the server finding the engineer. Try again')
        }
    } 

    public async findAllEngineers(userId: string): Promise<engineer[]> {
        const agentId = userId

        if (!agentId) throw new NotFoundException('User does not exist')

        try {
            const allEngineers = await prisma.engineer.findMany({
                include: { engineer_tickets: true }
            }) 

            return allEngineers
        } catch (err) {
            console.log('there was an error finding the agents with roles', err)
            throw new InternalServerErrorException('There was an error finding the agents with roles.')
        }
    }

    public async updateAnEngineerStats(updateEngineerDto: UpdateEngineerDto, userId: string) {
        const agentId = userId
        const { engineerId, engineer_email, engineer_name } = updateEngineerDto

        if (!agentId) throw new NotFoundException('User does not exist')

        try {
            const engineerToBeUpdated = await prisma.engineer.findUnique({ where: { userId: engineerId }, include: { user: true } })
            if (!engineerToBeUpdated) throw new NotFoundException('That agent does not exist in the database')

            const updatedEngineer = await prisma.user.update({ 
                where: { id: engineerToBeUpdated.userId },
                data: {
                    userName: engineer_name ?? engineerToBeUpdated.user.userName,
                    userEmail: engineer_email ?? engineerToBeUpdated.user.userEmail,
                },
                
            })

            return updatedEngineer
        } catch(err) {
            console.log(`error updating the stats for engineer with ID: ${engineerId}`)
            throw new InternalServerErrorException('There was an error updating the agent stats. Must be the server, try again.')
        }
    }

    public async deleteEngineer(engineerId: string, userId: string) {
        const agentId = userId

        if (!agentId) throw new NotFoundException('User does not exist')

        try {
            const engineerToBeDeleted = await prisma.engineer.findUnique({
                where: { engineerId: engineerId }
            })

            if (!engineerToBeDeleted) throw new NotFoundException('Engineer not found');

            await prisma.engineer.delete({ where: { engineerId: engineerId } })

            return;
        } catch(err) {
            console.log('Error deleting the engineer', err)
            throw new InternalServerErrorException(`Engineer was not deleted due to server error. Try again`)
        }      
    }

    public async getEngineerTicket(newTicket_id: string, engineerId: string) {
        return await this.engineerTicketsService.getEngineerTicket(newTicket_id, engineerId)
    }
}
