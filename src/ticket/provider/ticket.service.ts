import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateTicketDto } from '../dtos/create-ticket.dto';
import { comment, ticket } from '@prisma/client';
import prisma from 'prisma/prisma_Client';
import { UpdateTicketStatusDto } from '../dtos/update-ticket.dto';
import { Status } from '../enum/status.enum';
import { MetricsService } from './metrics.service';
import { CommentsService } from 'src/comments/provider/comments.service';
import { AddCommentDto } from 'src/comments/dtos/add_comment.dto';
import { SortTicketsDto } from '../dtos/sort-tickets.dto';
import { CategoryService } from 'src/category/provider/category.service';
import { CustomerService } from 'src/customer/provider/customer.service';
import { NewTicketEmailData } from 'src/mailer/interfaces/NewTicketeEmailData.interface';
import { EngineerService } from 'src/engineer/provider/engineer.service';
import { MailService } from 'src/mailer/provider/mail.service';
import { DependentTicketService } from './dependent-ticket.service';
import { GenerateCustomTicketIdService } from './generate-custom-ticket-id.service';
import { AssignTicketsByCatToEngsService } from './assign-tickets-by-cat-to-engs.service';
import { isUUID } from 'class-validator';

@Injectable()
export class TicketService {
    constructor(
        private readonly metricsService: MetricsService,
        private readonly commentsService: CommentsService,
        private readonly categoryService: CategoryService,
        private readonly customerService: CustomerService,
        private readonly engineerService: EngineerService,
        private readonly dependentTicketService: DependentTicketService,
        private readonly mailService: MailService,
        private readonly generateCustomTicketIdService: GenerateCustomTicketIdService,
        private readonly assignTicketsByCatToEngsService: AssignTicketsByCatToEngsService,
    ) {}

    public async createTicket(createTicketDto: CreateTicketDto, userId: string): Promise<ticket> {
        const { c_name, issue_description, priority, categoryName, featuredImageUrl, dependent_ticketCustomId, engineerIds } = createTicketDto;
    
        const agent = await prisma.agent.findUnique({
            where: { userId: userId }
        });
    
        if (!agent) throw new NotFoundException('User does not exist');
    
        const customer = await this.customerService.getSingleCustomerByName(c_name);
        const category = await this.categoryService.getSingleCategoryByName(categoryName);
        const customId = await this.generateCustomTicketIdService.generateCustomTicketId(categoryName);
    
        try {
            const newTicket = await prisma.ticket.create({
                data: {
                    customerId: customer.id,
                    agentId: agent.agentId,
                    issue_description: issue_description,
                    priority: priority,
                    categoryId: category.id,
                    featuredImageUrl: featuredImageUrl ? featuredImageUrl : null,
                    status: Status.PENDING,
                    customTicketId: customId
                },
                include: { customer: true }
            });
    
            // Έλεγχος dependent ticket
            if (dependent_ticketCustomId) {
                const dependent_ticket = await prisma.ticket.findUnique({ where: { customTicketId: dependent_ticketCustomId } });

                if (!dependent_ticket) throw new NotFoundException('Dependent ticket was not found');
                if (newTicket.customTicketId === dependent_ticket.customTicketId) throw new BadRequestException('A ticket cannot depend on itself.');

                await this.dependentTicketService.getDependentTicket(newTicket.customTicketId, dependent_ticket.customTicketId);
            } else {
                console.log('Δεν χρειαστηκε να φτιαχτει καποια σχεση μεταξυ tickets');
            }
    
            // Έλεγχος και ανάθεση engineers
            if (Array.isArray(engineerIds) && engineerIds.every(id => isUUID(id))) {
                await this.assignTicketToEng(newTicket.customTicketId, engineerIds, userId);
            } else if (engineerIds === undefined) {
                console.log(`Δεν βρεθηκε engineer, προχωραει η αυτοματη αναθεση αναλογα το priority level`);
                const availableEngs = await this.assignTicketsByCatToEngsService.assignTicketsByCatToEngs(priority, categoryName, newTicket.id);
    
                if (availableEngs === undefined) {
                    console.log('Δεν έγινε αυτόματη ανάθεση.');
                    return newTicket;
                } else {
                    await Promise.all(
                        availableEngs.map(async engineer => await this.engineerService.getEngineerTicket(newTicket.customTicketId, engineer.engineerId))
                    );
                    console.log('Εγινε αυτοματα η αναθεση');
                }
            } else {
                throw new BadRequestException('The ID of the engineer was wrong');
            }
    
            return newTicket;
        } catch(err) {
            if (err instanceof NotFoundException) {
                console.log('Dependent ticket or engineer was not found:', err.message);
                await prisma.ticket.delete({ where: { customTicketId: customId } })
                throw err;
            } else if (err instanceof BadRequestException) {
                console.log('There was an error with the database:', err.message);
                await prisma.ticket.delete({ where: { customTicketId: customId } })
                throw err
            }
            console.log('ticket was not created', err);
            await prisma.ticket.delete({ where: { customTicketId: customId } })
            throw new InternalServerErrorException('There was an error with the server. Try again');
        };
    }

    public async assignTicketToEng(customId: string, engineerIds: string[], userId: string) {
        const agent = await prisma.agent.findUnique({ 
            where: { userId: userId }
        })

        if (!agent) throw new NotFoundException('User does not exist')

        const ticket = await prisma.ticket.findUnique({ where: { customTicketId: customId }, include: { customer: true } })
            
        if (!ticket) throw new NotFoundException('Ticket does not exist')
            
        const ticketAlreadyAssignedToEng = await Promise.all(engineerIds.map(async (engId) => {
            return prisma.assigned_engineers.findUnique({ where: {
                ticketCustomId_engineerId: {
                    engineerId: engId,
                    ticketCustomId: customId
                }
            }})
        }))
           
        if (ticketAlreadyAssignedToEng) throw new ConflictException('Ticket is already assigned to that engineer. Pick a different one')
        
        if (engineerIds.length > 0 && engineerIds.every(id => isUUID(id))) {    
            try {
                const userEngineers = await prisma.user.findMany({ 
                    where: {  
                        id: {
                            in: Array.isArray(engineerIds) ? engineerIds : [engineerIds] 
                        }  
                    },   
                    include: { engineer: true }
                })

                if (!userEngineers || userEngineers.length !== engineerIds.length) {
                    throw new BadRequestException('Some of the provided engineers do not exist in the database')
                }

                await Promise.all(userEngineers.map(async (userEngineer) => {
                    await this.engineerService.getEngineerTicket(ticket.customTicketId, userEngineer.engineer.engineerId)
                
                    const newTicketEmailData: NewTicketEmailData = {
                        engineer_email: userEngineer.userEmail,
                        engineer_name: userEngineer.userName,
                        newTicket_id: ticket.id,
                        c_name: ticket.customer.c_name,
                        issue_description: ticket.issue_description, 
                        priority: ticket.priority
                    }

                    await this.mailService.sendEmailForNewTicket(newTicketEmailData)
                    console.log('πηγε το εμαιλ για το νεο ticket')    
                    console.log(`Φτιαχτηκε μια σχεση με τον engineer με ID: ${userEngineer.engineer.engineerId} και το ticket με ID: ${ticket.customTicketId}`)
                }))
                
                return true
            } catch (err) {
                if (err instanceof BadRequestException) throw err
                else if (err instanceof NotFoundException) throw err
                else if (err instanceof ConflictException) throw err

                console.log('ticket was not created due to engineer assignment issue', err)
                throw new InternalServerErrorException('There was an error with the server. Try again')
            }
        } else {
            throw new BadRequestException('Engineer IDs should be an array and not empty');
        }
    } 

    public async getAllTickets(sortTicketsDto: SortTicketsDto, userId: string): Promise<ticket[]> {
        const agent = await prisma.agent.findUnique({ 
            where: { userId: userId }
        })

        const engineerByCategory = await prisma.engineer.findUnique({
            where: { userId: userId },
            include: { category: true }
        })
    
        if (!agent && !engineerByCategory) throw new NotFoundException('User does not exist')

        const categoryId = engineerByCategory?.category?.id

        try {
            const ticketList = await prisma.ticket.findMany({
                where: agent ? {} : { categoryId },
                orderBy: [
                    { created_at: 'desc' },
                    { customTicketId: 'asc' }
                ],
                include: { 
                    category: true,
                    customer: true,
                    comment: true,
                    agent: { select: { asUser: { select: { id: true, userName: true, userEmail: true } } } },
                    dependent_tickets_ticketCustomId: { select: { ticketCustomId: true } }, 
                    dependent_tickets_dependentTicketCustomId: { select: { dependentTicketCustomId: true } },
                    assigned_engineers: {
                        select: {
                            engineer: {
                                select: {
                                    asUser: {
                                        select: { 
                                            id: true, userName: true, userEmail: true
                                        } 
                                    } 
                                } 
                            } 
                        } 
                    }
                }
            })

            if (ticketList && ticketList.length > 0) {
                return ticketList
            } else return []
        } catch(err: any) {
            console.log('No tickets were returned', err)
            throw new InternalServerErrorException('There was an error with the server. Try again')
        }
    }

    public async getSingleTicket(customId: string): Promise <ticket> {
        try {
            const singleTicket = await prisma.ticket.findUnique({
                where: { customTicketId: customId },
                include: { 
                    category: true,
                    customer: true,
                    comment: true,
                    agent: { select: { asUser: { select: { id: true, userName: true, userEmail: true } } } },
                    dependent_tickets_ticketCustomId: { select: { ticketCustomId: true } }, 
                    dependent_tickets_dependentTicketCustomId: { select: { dependentTicketCustomId: true } },
                    assigned_engineers: {
                        select: {
                            engineer: {
                                select: {
                                    asUser: {
                                        select: { 
                                            id: true, userName: true, userEmail: true
                                        } 
                                    } 
                                } 
                            } 
                        } 
                    }
                }
            })

            return singleTicket
        } catch(err: any) {
            console.log('Could not find the ticket', err)
            throw new InternalServerErrorException('There was an error with the server. Try again')
        }
    }

    public async updateTicketStatus(updateTicketStatusDto: UpdateTicketStatusDto, userId: string): Promise<ticket> {
        const { customId, status } = updateTicketStatusDto
        const validStatus = ['pending', 'resolved', 'in_progress']

        const agentId = userId

        if (!agentId) throw new NotFoundException('User does not exist')

        if (!customId) throw new NotFoundException('Ticket ID is required')

        if (!validStatus.includes(status)) throw new BadRequestException('Cannot use more than one status')  

        try {
            const ticketToBeUpdated = await prisma.ticket.findUnique({ 
                where: { customTicketId: customId },
                include: { 
                    comment: true,
                    dependent_tickets_ticketCustomId: { select: { ticketCustomId: true } }, 
                    dependent_tickets_dependentTicketCustomId: { select: { dependentTicketCustomId: true } },
                    assigned_engineers: { select: { engineerId: true } }
                }
            })
            
            if (!ticketToBeUpdated) throw new NotFoundException('Ticket not found');
            
            if (!ticketToBeUpdated.comment) ticketToBeUpdated.comment = []
        
            const updatedTicket = await prisma.ticket.update({ 
                where: { id: ticketToBeUpdated.id },
                data: {
                    status: status,
                    updated_at: new Date(),
                    comment: ticketToBeUpdated.comment?.length > 0 ? {
                        upsert: ticketToBeUpdated.comment.map(comment => ({
                            where: { id: comment.id || '' },
                            update: { content: comment.content },
                            create: { content: comment.content }
                        }))
                    } : undefined
                } 
            })
            return updatedTicket
        } catch(err: any) {
            console.log('Error updating the ticket status', err)
            throw new InternalServerErrorException('Ticket status was not updated due to server error')
        }
    }

    public async addNewCommentForTicket(addCommentDto: AddCommentDto, userId: string) {
        const { content, customId } = addCommentDto

        const agentId = userId

        if (!agentId) throw new NotFoundException('User does not exist')

        try {
            const ticket = await this.getSingleTicket(customId)
 
            if (!ticket) {
            console.log('Το ticket δεν βρεθηκε')
            throw new NotFoundException('That ticket was not found')
            }

            const newComment = await this.commentsService.AddComment(content, customId, userId)
            return newComment              
        } catch(err) {
            console.log('Error creating the comment', err)
            throw new InternalServerErrorException('Comment was not created due to server error')
        }
    }

    public async getTicketsMetrics(userId: string): Promise<object | undefined> {
        const agentId = userId

        if (!agentId) throw new NotFoundException('User does not exist')

        const ticketVolume = await this.metricsService.getTicketVolume()
        const avgResolutionTimeInHours = await this.metricsService.getAverageResolutionTime()
        const pendingTickets = await this.metricsService.getPendingTicketCount()
        const resolvedTickets = await this.metricsService.getResolvedTicketCount()
        const inProgressTickets = await this.metricsService.getInProgressTicketCount()
        const pendingRequests = await this.metricsService.getPendingRequestsCount()
        const approvedRequests = await this.metricsService.getApprovedRequestsCount()
        const rejectedRequests = await this.metricsService.getRejectedRequestsCount()

        return {
            ticketVolume,
            avgResolutionTimeInHours,
            pendingTickets,
            resolvedTickets,
            inProgressTickets,
            pendingRequests,
            approvedRequests,
            rejectedRequests
        }
    }

    public async deleteTicket() {}
}
