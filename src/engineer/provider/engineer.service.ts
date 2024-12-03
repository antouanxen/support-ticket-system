import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateEngineerDto } from '../dtos/create-engineer.dto';
import { engineer } from '@prisma/client';
import prisma from 'prisma/prisma_Client';
import { UpdateEngineerDto } from '../dtos/update-engineer.dto';
import { EngineerTicketsService } from './engineer-tickets.service';

@Injectable()
export class EngineerService {
    constructor(
        private readonly engineerTicketsService: EngineerTicketsService
    ) {}

    public async createEngineer(createEngineerDto: CreateEngineerDto, userId: string): Promise<engineer | { message: string }> {
        const agentId = userId

        if (!agentId) throw new NotFoundException('User does not exist')

        try {
            const existingEngineer = await prisma.engineer.findUnique({
                where: { engineer_email: createEngineerDto.engineer_email }
            })

            if (existingEngineer) return { message: 'The email already exists for an engineer.' };
            
            const newEngineer = await prisma.engineer.create({
                data: {
                    engineer_name: createEngineerDto.engineer_name,
                    engineer_email: createEngineerDto.engineer_email,
                }
            })

            return newEngineer
        } catch(err) {
            console.log('Engineer was not created', err)
            throw new InternalServerErrorException('There was an error with the server creating the engineer. Try again')
        }
    }

    public async findSingleEngineer(engineer_id: string): Promise<engineer> {
        try {
            const singleEngineer = await prisma.engineer.findUnique({ 
                where: { engineer_id: engineer_id }
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

    public async updateAnEngineerStats(updateEngineerDto: UpdateEngineerDto, userId: string): Promise<Partial<engineer>> {
        const agentId = userId
        const { engineer_id, engineer_email, engineer_name } = updateEngineerDto

        if (!agentId) throw new NotFoundException('User does not exist')

        try {
            const engineerToBeUpdated = await prisma.engineer.findUnique({ where: { engineer_id: updateEngineerDto.engineer_id } })
            if (!engineerToBeUpdated) throw new NotFoundException('That agent does not exist in the database')

            const updatedEngineer = await prisma.engineer.update({ 
                where: { engineer_id: engineerToBeUpdated.engineer_id },
                data: {
                    engineer_name: engineer_name ?? engineerToBeUpdated.engineer_name,
                    engineer_email: engineer_email ?? engineerToBeUpdated.engineer_email,
                }
            })

            return updatedEngineer
        } catch(err) {
            console.log(`error updating the stats for engineer with ID: ${engineer_id}`)
            throw new InternalServerErrorException('There was an error updating the agent stats. Must be the server, try again.')
        }
    }

    public async deleteEngineer(engineer_id: string, userId: string) {
        const agentId = userId

        if (!agentId) throw new NotFoundException('User does not exist')

        try {
            const engineerToBeDeleted = await prisma.engineer.findUnique({
                where: { engineer_id: engineer_id }
            })

            if (!engineerToBeDeleted) throw new NotFoundException('Engineer not found');

            await prisma.engineer.delete({ where: { engineer_id: engineer_id } })

            return;
        } catch(err) {
            console.log('Error deleting the engineer', err)
            throw new InternalServerErrorException(`Engineer was not deleted due to server error. Try again`)
        }      
    }

    public async getEngineerTicket(newTicket_id: string, engineer_id: string) {
        return await this.engineerTicketsService.getEngineerTicket(newTicket_id, engineer_id)
    }
}
