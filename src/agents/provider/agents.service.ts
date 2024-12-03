import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import prisma from 'prisma/prisma_Client';
import { UpdateRoleForAgentDto } from '../dtos/update-role_for_Agent.dto';
import { AgentWithRole } from '../types/AgentWithRole.type';
import { RoleService } from 'src/role/provider/role.service';
import { UpdateAgentStatsDto } from '../dtos/update-agent.dto';
import { RequestPermissionService } from 'src/request-permission/provider/request-permission.service';
import { AssignAgentDto } from '../dtos/assignAgent.dto';
import { RequestStatus } from 'src/request-permission/enums/request_status.enum';

@Injectable()
export class AgentsService {
    constructor(
        private readonly roleService: RoleService,
        private readonly reqPermService: RequestPermissionService
    ) {}

    public async getAllAgents(userId: string) {
        const agentId = userId

        if (!agentId) throw new NotFoundException('User does not exist')

        try {
            const allAgents = await prisma.agent.findMany({
                select: { 
                    id: true,
                    agentName: true,
                    agentEmail: true,
                    last_logged_at: true,
                    role: { select: { role_description: true } } 
                }
            }) 

            return allAgents
        } catch (err) {
            console.log('there was an error finding all the agents', err)
            throw new InternalServerErrorException('There was an error finding all the agents.')
        }
    }

    public async getAllAgentswithRoles(userId: string) {
        const agentId = userId

        if (!agentId) throw new NotFoundException('User does not exist')

        try {
            const allAgentWithRoles = await prisma.agent.findMany({
                where: { roleId: { not: null } },
                select: { 
                    id: true,
                    agentName: true,
                    agentEmail: true,
                    last_logged_at: true,
                    role: { select: { role_description: true } } 
                }
            }) 

            return allAgentWithRoles
        } catch (err) {
            console.log('there was an error finding the agents with roles', err)
            throw new InternalServerErrorException('There was an error finding the agents with roles.')
        }
    }

    public async getAllAgentsLogs(userId: string) {
        const agentId = userId

        if (!agentId) throw new NotFoundException('User does not exist')

        try {
            const allAgentsLogs = await prisma.agent.findMany({
                select: { 
                    id: true,
                    agentName: true,
                    agentEmail: true,
                    last_logged_at: true,
                    role: { select: { role_description: true } }
                },
                orderBy: {
                    last_logged_at: 'desc'
                }
            })

            const nonAdminUsers = allAgentsLogs.filter((agent) => agent.role?.role_description !== 'admin')

            return nonAdminUsers
        } catch (err) {
            console.log('there was an error finding the logs for the agents', err)
            throw new InternalServerErrorException('There was an error finding the agents logs.')
        }
    }

    public async getSingleAgent(agentIdTofind: string) {
        try {
            const agentToFind = await prisma.agent.findUnique({
                where: { id: agentIdTofind },
                select: { 
                    id: true,
                    agentName: true,
                    agentEmail: true,
                    last_logged_at: true,
                    role: { select: { role_description: true } }
                }
            })

            if (!agentToFind) throw new NotFoundException('User was not found in the database.')

            return agentToFind
        } catch (err) {
            console.log('there was an error trying to find that user', err)
            throw new InternalServerErrorException('There was an error trying to find that user. Please try again.')
        }
    }

    public async assignAgentToSV(assignAgentDto: AssignAgentDto, userId: string) {
        const agentId = userId
        const { supervisorId, agentIdToGetAssigned } = assignAgentDto

        if (!agentId) throw new NotFoundException('User does not exist')
        console.log(supervisorId, agentIdToGetAssigned)

        if (supervisorId === agentIdToGetAssigned) throw new BadRequestException('An agent cannot get assigned to themselves.')
        try {
            const [supervisor, agentToGetAssigned] = await Promise.all([ 
                prisma.agent.findUnique({ 
                    where: { id: supervisorId },
                    include: { role: true }
                }),
                prisma.agent.findUnique({ 
                    where: { id: agentIdToGetAssigned } 
                })
            ])   

            let result: boolean = false

            try {
                await prisma.supervisors_agents.create({ 
                    data: {
                        supervisor: supervisor.id,
                        agent: agentToGetAssigned.id,
                        assigned_at: new Date()
                    }
                })
                result = true
            } catch (err) {
                console.error('Αποτυχία κατά τη δημιουργία της ανάθεσης:', err)
                return false
            }
            
            // εδω θα στελνεται το εμαιλ στον SV για την αναθεση

            console.log(`Η αναθεση μεταξυ supervisor (ID: ${supervisor.id}) & agent (ID: ${agentToGetAssigned.id}) ολοκληρωθηκε`)
            return result
        } catch (err) {
            console.log('there was an error getting the assignement completed', err)
            throw new InternalServerErrorException('There was an error getting the assignement completed. Please try again.')
        }
    }

    public async updateRoleForAgents(updateRoleDto: UpdateRoleForAgentDto, userId: string): Promise<AgentWithRole> {
        const { role_description, agentIdForRole } = updateRoleDto

        const agentId = userId

        if (!agentId) throw new NotFoundException('User does not exist')

        try {
            const agentToUpdateRole = await prisma.agent.findUnique({
                where: { id: agentIdForRole }
            })

            if (!agentToUpdateRole) throw new NotFoundException('That agent does not exist in the database')
            
            const roleForAgent = await this.roleService.findRoleByDesc(role_description)

            const updatedRoleForAgent = await prisma.agent.update({
                where: { id: agentToUpdateRole.id },
                data : {
                    roleId: roleForAgent.role_id,
                    updated_at: new Date()
                },
                include: { role: true }
            })

            return updatedRoleForAgent
        } catch (err) {
            console.log(`error updating role for agent with ID: ${agentIdForRole}`)
            throw new InternalServerErrorException('There was an error updating the agent role. Must be the server, try again.')
        }
    }

    public async updateAgentDetails(request_id: string , agentId: string): Promise<UpdateAgentStatsDto | { message: string }> {
        
        const processedRequest = await this.reqPermService.findProcessedRequest(request_id, agentId)

        if (processedRequest.request_status === RequestStatus.APPROVED) {
            const approvedRequest = processedRequest
            
            if (approvedRequest && approvedRequest.requestForAgent === agentId) {
                try {
                    const agentToBeUpdated = await prisma.agent.findUnique({ where: { id: agentId } })
                    if (!agentToBeUpdated) throw new NotFoundException('That agent does not exist in the database')
        
                    const updatedAgentWithPerm = await prisma.agent.update({ 
                        where: { id: agentToBeUpdated.id },
                        data: {
                            agentName: approvedRequest.agentName ?? agentToBeUpdated.agentName,
                            agentEmail: approvedRequest.agentEmail ?? agentToBeUpdated.agentEmail,
                            agentPassword: approvedRequest.agentPassword ?? agentToBeUpdated.agentPassword
                        }
                    })
    
                    const agentStats = new UpdateAgentStatsDto({
                        agentName: updatedAgentWithPerm.agentName,
                        agentEmail: updatedAgentWithPerm.agentEmail
                    })
        
                    return agentStats
                } catch(err) {
                    if (err instanceof NotFoundException) {
                        console.log('Request was not found', err.message)
                        throw err
                    }
                    console.log(`error updating the stats for agent with ID: ${agentId}`, err)
                    throw new InternalServerErrorException(`There was an error updating the agent stats. Must be the server, try again.`)
                }
            }
        }
        else return { message: 'The request was rejected. Please communicate with your supervisor.'}
    }

    public async deleteAnAgent(agentIdToDelete: string, userId: string) {
        const agentId = userId

        if (!agentId) throw new NotFoundException('User does not exist')

        try {
            const agentToBeDeleted = await prisma.agent.findUnique({
                where: { id: agentIdToDelete }
            })

            if (!agentToBeDeleted) throw new NotFoundException('Agent not found');

            await prisma.agent.delete({ where: { id: agentIdToDelete } })

            return;
        } catch(err) {
            console.log('Error deleting the agent', err)
            throw new InternalServerErrorException(`Agent was not deleted due to server error. Try again`)
        }      
    }
}
