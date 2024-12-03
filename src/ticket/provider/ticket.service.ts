import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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
import { AssignTicketToEngDto } from '../dtos/assignTicket-toEng.dto';

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
    ) {}

    public async createTicket(createTicketDto: CreateTicketDto, userId: string): Promise<ticket> {
        const { c_name, issue_description, priority, categoryName, featuredImageUrl, dependent_ticketId, engineer_id } = createTicketDto

        const agentId = userId

        if (!agentId) throw new NotFoundException('User does not exist')

        const customer = await this.customerService.getSingleCustomerByName(c_name)
        const category = await this.categoryService.getSingleCategoryByName(categoryName)
        
        try {
            const newTicket = await prisma.ticket.create({
                data: {
                    customerId: customer.id,
                    agentId: agentId,
                    issue_description: issue_description, 
                    priority: priority,
                    categoryId: category.id,
                    featuredImageUrl: featuredImageUrl ? featuredImageUrl : null,
                    status: Status.PENDING,
                },
                include: { customer: true }
            })
            
            if (dependent_ticketId) {
                if (newTicket.id === dependent_ticketId) throw new BadRequestException('A ticket cannot depend on itself.')
                    await this.dependentTicketService.getDependentTicket(newTicket.id, dependent_ticketId)
            }
            
            if (engineer_id) {
                const engineer = await this.engineerService.findSingleEngineer(engineer_id)
                await this.engineerService.getEngineerTicket(newTicket.id, engineer.engineer_id)

                const newTicketEmailData: NewTicketEmailData = {
                    engineer_email: engineer.engineer_email,
                    engineer_name: engineer.engineer_name,
                    newTicket_id: newTicket.id,
                    c_name: newTicket.customer.c_name,
                    issue_description: newTicket.issue_description, 
                    priority: newTicket.priority
                }
                await this.mailService.sendEmailForNewTicket(newTicketEmailData)
                console.log('πηγε το εμαιλ για το νεο ticket')    
            }

            return newTicket
        } catch(err: any) {
            console.log('ticket was not created', err)
            throw new InternalServerErrorException('There was an error with the server. Try again')
        }
    }

    public async assignTicketToEng(assignTicketToEng: AssignTicketToEngDto, userId: string) {
        const agentId = userId
        const { ticket_id, engineer_id } = assignTicketToEng

        if (!agentId) throw new NotFoundException('User does not exist')

        const ticket = await prisma.ticket.findUnique({ where: { id: ticket_id }, include: { customer: true } })
            
        if (!ticket) throw new NotFoundException('Ticket does not exist')
        
        if (engineer_id) {
            try {
                const engineer = await this.engineerService.findSingleEngineer(engineer_id)
                if (!engineer) throw new NotFoundException('Engineer does not exist in database ')

                await this.engineerService.getEngineerTicket(ticket.id, engineer.engineer_id)
                
                const newTicketEmailData: NewTicketEmailData = {
                    engineer_email: engineer.engineer_email,
                    engineer_name: engineer.engineer_name,
                    newTicket_id: ticket.id,
                    c_name: ticket.customer.c_name,
                    issue_description: ticket.issue_description, 
                    priority: ticket.priority
                }
                await this.mailService.sendEmailForNewTicket(newTicketEmailData)
                console.log('πηγε το εμαιλ για το νεο ticket')    
                console.log(`Aνανεωθηκε το relation με τον engineer με ID: ${engineer.engineer_id} και το ticket με ID: ${ticket.id}`)
            } catch (err) {
                console.log('ticket was not created', err)
                throw new InternalServerErrorException('There was an error with the server. Try again')
            }
            return true
        }
    } 

    public async getAllTickets(sortTicketsDto: SortTicketsDto, userId: string): Promise<ticket[]> {
        const agentId = userId

        if (!agentId) throw new NotFoundException('User does not exist')
        
        try {
            const ticketList = await prisma.ticket.findMany({
                orderBy: { created_at: 'desc' },
                include: { 
                    category: true,
                    customer: true,
                    comment: true,
                    agent: { select: { id: true, agentEmail: true, agentName: true } },
                    dependent_tickets_dependentTicket: true,
                    dependent_tickets_ticket: true,
                    engineer_tickets: true
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

    public async getSingleTicket(ticket_id: string): Promise <ticket> {
        try {
            const singleTicket = await prisma.ticket.findUnique({
                where: { id: ticket_id },
                include: { 
                    category: true,
                    customer: true,
                    comment: true,
                    agent: { select: { id: true, agentEmail: true, agentName: true } },
                    dependent_tickets_dependentTicket: true,
                    dependent_tickets_ticket: true,
                    engineer_tickets: true
                }
            })

            return singleTicket
        } catch(err: any) {
            console.log('Could not find the ticket', err)
            throw new InternalServerErrorException('There was an error with the server. Try again')
        }
    }

    public async updateTicketStatus(updateTicketStatusDto: UpdateTicketStatusDto, userId: string): Promise<ticket> {
        const { ticketId, status } = updateTicketStatusDto
        const validStatus = ['pending', 'resolved', 'in_progress']

        const agentId = userId

        if (!agentId) throw new NotFoundException('User does not exist')

        if (!ticketId) throw new NotFoundException('Ticket ID is required')

        if (!validStatus.includes(status)) throw new BadRequestException('Cannot use more than one status')  

        try {
            const ticketToBeUpdated = await prisma.ticket.findUnique({ 
                where: { id: ticketId },
                include: { 
                    comment: true,
                    dependent_tickets_dependentTicket: true, 
                    dependent_tickets_ticket: true
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

    public async addNewCommentForTicket(addCommentDto: AddCommentDto, userId: string): Promise<comment> {
        const { content, ticketId } = addCommentDto

        const agentId = userId

        if (!agentId) throw new NotFoundException('User does not exist')

        try {
            const ticket = await this.getSingleTicket(ticketId)
 
            if (!ticket) {
            console.log('Το ticket δεν βρεθηκε')
            throw new NotFoundException('That ticket was not found')
            }

            const newComment = await this.commentsService.AddComment(content, ticketId, userId)
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