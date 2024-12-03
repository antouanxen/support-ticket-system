import { Injectable, NotFoundException } from '@nestjs/common';
import prisma from 'prisma/prisma_Client';

@Injectable()
export class FindAssignedAgentsService {
    constructor() {}

    public async findAssignedAgents(agentId: string) {
        if (!agentId) throw new NotFoundException('The ID for the agent is required.')
        
        try {
            const supervisorAgentExists = await prisma.supervisors_agents.findFirst({ 
                where: { agent: agentId },
                include: { 
                    supervisors_agents_assignedAsSupervisor: true,
                    supervisors_agents_assignedAsAgent: true
                }
            }) 

            return supervisorAgentExists
        } catch (err) {
            console.log('O agent δεν βρεθηκε', err)
            throw new NotFoundException(`The agent (ID: ${agentId} does not exist. Try again)`)
        }  
    }
}