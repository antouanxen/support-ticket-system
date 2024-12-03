import { Injectable, InternalServerErrorException } from '@nestjs/common';
import prisma from 'prisma/prisma_Client';
import { Status } from '../enum/status.enum';
import { RequestStatus } from 'src/request-permission/enums/request_status.enum';

@Injectable()
export class MetricsService {
    constructor() {}

    public async getTicketVolume(): Promise<number> {
       try {
            const ticketCount = await prisma.ticket.count()
            return ticketCount
        } catch(err) {
            console.log('θεμα με το ticket volume', err)
            throw new InternalServerErrorException('Could not count the ticket volume. Try again')
        }
    }

    public async getAverageResolutionTime(): Promise<number> {
       try {
            const resolvedTickets = await prisma.ticket.findMany({
                where: { status: Status.RESOLVED},
                select: {
                    created_at: true,
                    updated_at: true
                }
            })

            if (resolvedTickets.length === 0) {
                console.log('No resolved tickets found.');
                return 0;
            }    

            const totalResolutionTime = resolvedTickets.reduce((result, ticket) => {
                const resolutionTime = (ticket.updated_at.getTime() - ticket.created_at.getTime()) / (1000 * 60 * 60)
                return result + resolutionTime
            }, 0)

            const avgResolutionTime = totalResolutionTime / resolvedTickets.length
            const trueResolutionTime = Number.parseInt(avgResolutionTime.toFixed(2))
            console.log('Average resolution time in hours:', trueResolutionTime)
            return trueResolutionTime
        } catch(err) {
            console.log('θεμα με το ticket resolution time', err)
            throw new InternalServerErrorException('Could not find the ticket resolution time. Try again')
        }
    } 

    public async getPendingTicketCount(): Promise<number> {
        try {
            const pendingTickets = prisma.ticket.count({
                where: { status: Status.PENDING}
            })
    
            return pendingTickets
        } catch(err) {
            console.log('θεμα με το pending ticket count', err)
            throw new InternalServerErrorException('Could not find the pending ticket count. Try again')
        }
    }

    public async getResolvedTicketCount(): Promise<number> {
        try {
            const resolvedTickets = prisma.ticket.count({
                where: { status: Status.RESOLVED}
            })
    
            return resolvedTickets
        } catch(err) {
            console.log('θεμα με το resolved ticket count', err)
            throw new InternalServerErrorException('Could not find the resolved ticket count. Try again')
        }
    }

    public async getInProgressTicketCount(): Promise<number> {
        try {
            const inProgressTickets = prisma.ticket.count({
                where: { status: Status.IN_PROGRESS}
            })
    
            return inProgressTickets
        } catch(err) {
            console.log('θεμα με το in-progress ticket count', err)
            throw new InternalServerErrorException('Could not find the in-progress ticket count. Try again')
        }
    }

    public async getPendingRequestsCount(): Promise<number> {
        try {
            const pendingRequests = prisma.request_permission.count({
                where: { request_status: RequestStatus.PENDING}
            })
    
            return pendingRequests
        } catch(err) {
            console.log('θεμα με το pending requests count', err)
            throw new InternalServerErrorException('Could not find the pending requests count. Try again')
        }
    }

    public async getApprovedRequestsCount(): Promise<number> {
        try {
            const approvedRequests = prisma.request_permission.count({
                where: { request_status: RequestStatus.APPROVED}
            })
    
            return approvedRequests
        } catch(err) {
            console.log('θεμα με το pending requests count', err)
            throw new InternalServerErrorException('Could not find the pending requests count. Try again')
        }
    }

    public async getRejectedRequestsCount(): Promise<number> {
        try {
            const rejectedRequests = prisma.request_permission.count({
                where: { request_status: RequestStatus.PENDING}
            })
    
            return rejectedRequests
        } catch(err) {
            console.log('θεμα με το pending requests count', err)
            throw new InternalServerErrorException('Could not find the pending requests count. Try again')
        }
    }
}
