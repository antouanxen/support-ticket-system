import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { RequestForLeaveDto } from '../dtos/requestForLeave.dto';
import prisma from 'prisma/prisma_Client';
import { RequestForAgentUpdateDto } from '../dtos/requestForAgentUpdate.dto';
import { SeenRequestDto } from '../dtos/seenRequest.dto';
import { omit } from 'lodash';
import { request_permission } from '@prisma/client';
import { RequestStatus } from '../enums/request_status.enum';
import { NewRequestEmailData } from 'src/mailer/interfaces/NewRequestEmailData.interface';
import { MailService } from 'src/mailer/provider/mail.service';
import { FindAssignedAgentsService } from 'src/agents/provider/find_assigned_agents.service';
import { AgentRequestToSVEmailData } from 'src/mailer/interfaces/AgentRequestToSVEmailData.interace';
import { UpdateValidationEmailData } from 'src/mailer/interfaces/UpdateValidationEmailData.interface';

@Injectable()
export class RequestPermissionService {
    constructor(
        private readonly mailService: MailService,
        private readonly findAssignedAgentsService: FindAssignedAgentsService,
    ) {}

    public async requestForLeave(requestForLeaveDto: RequestForLeaveDto, userId: string) {
        const agentExists = await prisma.agent.findUnique({ where: { userId: userId } });

        if (!agentExists) throw new NotFoundException('Agent not found');

        const { requestType, request_status, numberOfDays } = requestForLeaveDto

        try {
            const newRequestForLeave = await prisma.request_permission.create({
                data: {
                    requestForAgent: userId,
                    requestType: requestType,
                    request_status: request_status,
                    numberOfDays: numberOfDays
                }
            })
            
            const assignedAgents = await this.findAssignedAgentsService.findAssignedAgents(agentExists.agentId)

            const agentRequesting = await prisma.agent.findUnique({ 
                where: { userId: assignedAgents.supervisors_agents_assignedAsAgent.agentId },
                include: { user: true }
            })

            const agentRequestingSupervisor = await prisma.agent.findUnique({ 
                where: { userId: assignedAgents.supervisors_agents_assignedAsSupervisor.agentId },
                include: { user: true }
            })

            const newRequestEmailData: NewRequestEmailData = {
                agentEmail: agentRequesting.user.userEmail,
                agentName: agentRequesting.user.userName, 
                requestType: newRequestForLeave.requestType,
                request_id: newRequestForLeave.request_id
            }
            await this.mailService.sendEmailToAgentAfterRequest(newRequestEmailData)
            console.log('πηγε το εμαιλ για το νεο request')

            const agentRequestToSVEmailData : AgentRequestToSVEmailData = {
                agentEmail: agentRequestingSupervisor.user.userEmail,
                agentName: agentRequestingSupervisor.user.userName, 
                requestType: newRequestForLeave.requestType,
                request_id: newRequestForLeave.request_id,
                agentIdRequested: agentRequesting.user.id,
                agentEmailRequested: agentRequesting.user.userEmail                
            }
            await this.mailService.sendEmailForAgentRequestToSV(agentRequestToSVEmailData)
            console.log('πηγε το εμαιλ για το νεο request για εξεταση στον supervisor')

            return newRequestForLeave
        } catch (err) {
            console.log('There was an error with the leave request', err)
            throw new InternalServerErrorException(`There was an error processing the request for leave for agent with ID: ${userId}`)
        }
    }

    public async requestForStatsUpdate(requestForAgentUpdate: RequestForAgentUpdateDto, userId: string) {
        const agentId = userId

        if (!agentId) throw new NotFoundException('That user was not found')

        const { requestType, request_status, agentName, agentEmail, agentPassword } = requestForAgentUpdate

        try {
            const newRequestForStatsUpdate = await prisma.request_permission.create({
                data: {
                    requestForAgent: agentId,
                    requestType: requestType,
                    request_status: request_status,
                    agentName: agentName ?? null,
                    agentEmail: agentEmail ?? null,
                    agentPassword: agentPassword ?? null
                }
            })
            
            const assignedAgents = await this.findAssignedAgentsService.findAssignedAgents(agentId)

            const agentRequesting = await prisma.agent.findUnique({ 
                where: { userId: assignedAgents.supervisors_agents_assignedAsAgent.agentId },
                include: { user: true }
            })

            const agentRequestingSupervisor = await prisma.agent.findUnique({ 
                where: { userId: assignedAgents.supervisors_agents_assignedAsSupervisor.agentId },
                include: { user: true }
            })

            const newRequestEmailData: NewRequestEmailData = {
                agentEmail: agentRequesting.user.userEmail,
                agentName: agentRequesting.user.userName, 
                requestType: newRequestForStatsUpdate.requestType,
                request_id: newRequestForStatsUpdate.request_id
            }
            await this.mailService.sendEmailToAgentAfterRequest(newRequestEmailData)
            console.log('πηγε το εμαιλ για το νεο request')

            const agentRequestToSVEmailData : AgentRequestToSVEmailData = {
                agentEmail: agentRequestingSupervisor.user.userEmail,
                agentName: agentRequestingSupervisor.user.userName, 
                requestType: newRequestEmailData.requestType,
                request_id: newRequestEmailData.request_id,
                agentIdRequested: agentRequesting.user.id,
                agentEmailRequested: agentRequesting.user.userEmail                
            }
            await this.mailService.sendEmailForAgentRequestToSV(agentRequestToSVEmailData)
            console.log('πηγε το εμαιλ για το νεο request για εξεταση στον supervisor')

            const dataWithoutPass = omit({ ...newRequestForStatsUpdate, agentPassword }, ['agentPassword'])
            return dataWithoutPass
        } catch (err) {
            console.log('There was an error with the leave request', err)
            throw new InternalServerErrorException(`There was an error with the request for new stats for agent with ID: ${agentId}`)
        }
    }

    public async seenAndProcessRequestStatus(seenRequestDto: SeenRequestDto, userId: string) {
        const agentId = userId

        try {
            const reqToProcess = await prisma.request_permission.findUnique({ 
                where: { request_id: seenRequestDto.request_id },
                include: { requestedByAgent: true } 
            })

            if (agentId === reqToProcess.requestedByAgent.agentId) {
                console.log('O user εχει ιδιο id με αυτον που εκανε το request')
                throw new ForbiddenException('You cannot approve or reject your own requests.')
            }

            const request = await prisma.request_permission.update({
                where: { request_id: reqToProcess.request_id },
                data: { 
                    request_status: seenRequestDto.request_status,
                    approvedBy: seenRequestDto.request_status === RequestStatus.APPROVED ? agentId : null,
                    rejectedBy: seenRequestDto.request_status === RequestStatus.REJECTED ? agentId : null,
                    approved_at: seenRequestDto.request_status === RequestStatus.APPROVED ? new Date() : null,
                    rejected_at: seenRequestDto.request_status === RequestStatus.REJECTED ? new Date() : null
                },
                include: { 
                    requestedByAgent: {
                        select: {
                            agentId: true, 
                            user: {
                                select: {
                                    id: true,
                                    userEmail: true,
                                    userName: true,
                                }
                            }  
                        } 
                    } 
                }
            })

            const agentWhoRequested = await prisma.agent.findUnique({ where: { agentId: request.requestedByAgent.agentId }, include: { user: true } }) 
            const updateValidationEmailData : UpdateValidationEmailData = {
                agentId: agentWhoRequested.agentId,  
                agentEmail: agentWhoRequested.user.userEmail,
                agentName: agentWhoRequested.user.userName, 
                request_id: request.request_id,
                requestType: request.requestType,
                request_status: request.request_status,            
                issued_at: request.issued_at
            }
           
            try {
                await this.mailService.sendEmailForUpdateValidToAgent(updateValidationEmailData)
                console.log('πηγε το εμαιλ για το νεο request για validation στον agent')
            } catch (emailErr) {
                console.log('Failed to send the email notification', emailErr)
            }

            return request
        } catch (err) {
            console.log('error processing the request', err)
            throw new InternalServerErrorException('There was an error processing the request. Must be the server, try again.')
        }
    }

    public async findProcessedRequest(agentId: string, request_id: string) {
        try {
           const processedRequest = await prisma.request_permission.findUnique({
               where: { 
                   requestForAgent: agentId,
                   request_id: request_id,
                   request_status: RequestStatus.APPROVED ? RequestStatus.APPROVED : RequestStatus.REJECTED
                }
            })
            
            if (!processedRequest) throw new NotFoundException('That request was not found.')

            return processedRequest
        } catch (err) {
            throw new NotFoundException('The request has not been approved or rejected yet. Try again.')
        }
    }

    public async getAllPendingRequests(userId: string): Promise<request_permission[]> {
        const agentId = userId

        if (!agentId) throw new NotFoundException('User does not exist')

        try {
            const requestList = await prisma.request_permission.findMany({
                where: { request_status: RequestStatus.PENDING },
                include: { requestedByAgent: true }
            }) 

            return requestList
        } catch (err) {
            console.log('there was an error finding the requests pending', err)
            throw new InternalServerErrorException('There was an error finding the requests pending.')
        }
    }

    public async getAllSeenRequestsForAdmin(userId: string): Promise<request_permission[]> {
        const agentId = userId

        if (!agentId) throw new NotFoundException('User does not exist')

        try {
            const permissionList = await prisma.request_permission.findMany({
                where: { request_status: RequestStatus.APPROVED || RequestStatus.REJECTED },
                include: { approvedByAgent: true, rejectedByAgent: true }
            }) 

            return permissionList
        } catch (err) {
            console.log('there was an error finding the requests pending', err)
            throw new InternalServerErrorException('There was an error finding the requests pending.')
        }
    }

    public async findSingleRequest(request_id: string): Promise<Partial<request_permission>> {
        try {
            const singleRequest = await prisma.request_permission.findUnique({ 
                where: { request_id: request_id },
                include: { 
                    requestedByAgent: { 
                        select: {
                            agentId: true, 
                            user: {
                                select: {
                                    id: true,
                                    userEmail: true,
                                    userName: true,
                                }
                            }  
                        }
                    } 
                }
            })

            if (!singleRequest) throw new NotFoundException('That request does not exist in the database')
            
            const { agentPassword, ...dataWithoutPass } = singleRequest
            return dataWithoutPass
        } catch (err) {
            console.log('request was not found', err)
            throw new InternalServerErrorException('There was an error with the server finding the request. Try again')
        }
    } 

    public async deleteRequests(userId: string) {
        const agentId = userId

        if (!agentId) throw new NotFoundException('User does not exist')

        try {
            const last5Requests = await prisma.request_permission.findMany({
                orderBy: { issued_at: 'asc' },
                take: 5,
                select: { request_id: true }
            }) 

            if (last5Requests.length < 5) throw new NotFoundException('Νot enough requests available for deletion.')

            const requestIds = last5Requests.map((req) => req.request_id)

            if (requestIds.length === 0) throw new NotFoundException('No valid requests found for deletion.');

            await prisma.request_permission.deleteMany({ 
                where: { 
                    request_id: { in: requestIds },
                    OR: [
                        { approvedBy: { not: null }, rejectedBy: null },
                        { rejectedBy: { not: null }, approvedBy: null }
                    ]
                }
            })
            return;
        } catch (err) {
            console.log('Error deleting the last 5 requests', err)
            throw new InternalServerErrorException(`The last five requests were not deleted due to server error. Try again`)
        }
    } 
}
