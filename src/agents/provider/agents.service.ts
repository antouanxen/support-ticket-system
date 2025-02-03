import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import prisma from 'prisma/prisma_Client';
import { UpdateRoleForAgentDto } from '../dtos/update-role_for_Agent.dto';
import { AgentWithRole } from '../types/AgentWithRole.type';
import { RoleService } from 'src/role/provider/role.service';
import { UpdateAgentStatsDto } from '../dtos/update-agent.dto';
import { RequestPermissionService } from 'src/request-permission/provider/request-permission.service';
import { AssignAgentDto } from '../dtos/assignAgent.dto';
import { RequestStatus } from 'src/request-permission/enums/request_status.enum';
import { AuthRoles } from 'src/authentication/enums/roles.enum';

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
            const allAgents = await prisma.user.findMany({
                where: { role: { role_description: { notIn: [AuthRoles.ENGINEER, AuthRoles.TEAM_LEADER_ENG] } } },
                select: { 
                    userId: true,
                    userName: true,
                    userEmail: true,
                    role: { select: { role_description: true } },
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
            const allAgentWithRoles = await prisma.user.findMany({
                where: { role: { NOT: null, role_description: { notIn: [AuthRoles.ENGINEER, AuthRoles.TEAM_LEADER_ENG] } } },
                select: { 
                    userId: true,
                    userName: true,
                    userEmail: true,
                    role: { select: { role_description: true } },
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
            const allAgentsLogs = await prisma.user.findMany({
                where: { role: { role_description: { notIn: [AuthRoles.ENGINEER, AuthRoles.TEAM_LEADER_ENG] } } },
                select: { 
                    userId: true,
                    userName: true,
                    userEmail: true,
                    last_logged_at: true,
                    role: { select: { role_description: true } },
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
            const agentToFind = await prisma.user.findFirst({
                where: { 
                    userId: agentIdTofind,
                    role: { role_description: { notIn: [AuthRoles.ENGINEER, AuthRoles.TEAM_LEADER_ENG] } } },
                select: {
                    userId: true,
                    userOwnEmail: true, 
                    userName: true,
                    userEmail: true,
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
                prisma.user.findUnique({ 
                    where: { userId: supervisorId },
                }),
                prisma.user.findUnique({ 
                    where: { userId: agentIdToGetAssigned}, 
                })
            ])   

            let result: boolean = false

            try {
                await prisma.supervisors_users.create({ 
                    data: {
                        supervisor: supervisor.userId,
                        user: agentToGetAssigned.userId,
                        assigned_at: new Date()
                    }
                })
                result = true
            } catch (err) {
                console.error('Αποτυχία κατά τη δημιουργία της ανάθεσης:', err)
                return false
            }
            
            // εδω θα στελνεται το εμαιλ στον SV για την αναθεση

            console.log(`Η αναθεση μεταξυ supervisor (ID: ${supervisor.userId}) & agent (ID: ${agentToGetAssigned.userId}) ολοκληρωθηκε`)
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
            const agentToUpdateRole = await prisma.user.findUnique({
                where: { userId: agentIdForRole }
            })

            if (!agentToUpdateRole) throw new NotFoundException('That agent does not exist in the database')
            
            const roleForAgent = await this.roleService.findRoleByDesc(role_description)

            const updatedRoleForAgent = await prisma.user.update({
                where: { userId: agentToUpdateRole.userId},
                data: {
                    roleId: roleForAgent.role_id,
                    updated_at: new Date()
                },
                include: { role: true }
            })

            return updatedRoleForAgent
        } catch (err) {
            console.log(`error updating role for agent with ID: ${agentIdForRole}`, err)
            throw new InternalServerErrorException('There was an error updating the agent role. Must be the server, try again.')
        }
    }

    public async updateAgentDetails(agentId: string, updateAgentStatsDto: UpdateAgentStatsDto): Promise<UpdateAgentStatsDto | { message: string }> {
        
        /* const processedRequest = await this.reqPermService.findProcessedRequest(agentId, request_id)

        if (processedRequest.request_status === RequestStatus.APPROVED) {
            const approvedRequest = processedRequest
            
            if (approvedRequest && approvedRequest.requestForAgent === agentId) { */
                try {
                    const agentToBeUpdated = await prisma.user.findUnique({ where: { userId: agentId } })
                    if (!agentToBeUpdated) throw new NotFoundException('That agent does not exist in the database')
        
                    const updatedAgentWithPerm = await prisma.user.update({ 
                        where: { userId: agentToBeUpdated.userId },
                        data: {
                            userName: updateAgentStatsDto.agentName ?? agentToBeUpdated.userName,
                            userEmail: updateAgentStatsDto.agentEmail ?? agentToBeUpdated.userEmail,
                            userPassword: updateAgentStatsDto.agentPassword ?? agentToBeUpdated.userPassword
                        }
                    })
    
                    const agentStats = new UpdateAgentStatsDto({
                        agentName: updatedAgentWithPerm.userName,
                        agentEmail: updatedAgentWithPerm.userEmail
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
        //else return { message: 'The request was rejected. Please communicate with your supervisor.'}

    public async deleteAnAgent(agentIdToDelete: string, userId: string) {
        const agentId = userId

        if (!agentId) throw new NotFoundException('User does not exist')

        try {
            const agentToBeDeleted = await prisma.user.findUnique({
                where: { userId: agentIdToDelete }
            })

            if (!agentToBeDeleted) throw new NotFoundException('Agent not found');

            await prisma.user.delete({ where: { userId: agentIdToDelete } })

            return;
        } catch(err) {
            console.log('Error deleting the agent', err)
            throw new InternalServerErrorException(`Agent was not deleted due to server error. Try again`)
        }      
    }
}
