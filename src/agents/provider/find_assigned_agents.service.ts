import { Injectable, NotFoundException } from '@nestjs/common';
import prisma from 'prisma/prisma_Client';

@Injectable()
export class FindAssignedAgentsService {
    constructor() {}

    public async findAssignedAgents(agentId: string) {
        if (!agentId) throw new NotFoundException('The ID for the agent is required.')
        
        try {
            const assignedAgents = await prisma.supervisors_users.findFirst({ 
                where: { user: agentId },
                include: { 
                    supervisors_users_supervisor: true,
                    supervisors_users_user: true,
                    
                }
            }) 

            return assignedAgents
        } catch (err) {
            console.log('O agent δεν βρεθηκε', err)
            throw new NotFoundException(`The agent (ID: ${agentId} does not exist. Try again)`)
        }  
    }
}