import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { WelcomeEmailData } from '../interfaces/WelcomeEmailData.interface';
import { NewTicketEmailData } from '../interfaces/NewTicketeEmailData.interface';
import { AgentRequestToSVEmailData } from '../interfaces/AgentRequestToSVEmailData.interace';
import { NewRequestEmailData } from '../interfaces/NewRequestEmailData.interface';
import { UpdateValidationEmailData } from '../interfaces/UpdateValidationEmailData.interface';
import { RequestType } from 'src/request-permission/enums/requestType.enum';
import { RequestStatus } from 'src/request-permission/enums/request_status.enum';

@Injectable()
export class MailService {
    constructor(
        private readonly mailerService: MailerService
    ) {}

    public async sendEmailWelcome(data: WelcomeEmailData) {
        const { userId, userEmail, userName } = data
        const baseUrl = process.env.BASE_URL
        await this.mailerService.sendMail({
            to: userEmail,
            from: `Support Team <info@smartupweb.com>`,
            subject: 'Welcome To The Team',
            template: './layout',
            context: {
                name: userName,
                agentId: userId,
                email: userEmail,
                baseUrl: baseUrl
            }
        })
    }

    public async sendEmailForNewTicket(data: NewTicketEmailData) {
        const { engineer_email, engineer_name, newTicket_id, c_name, issue_description, priority } = data 
        const baseUrl = process.env.BASE_URL
        await this.mailerService.sendMail({
            to: engineer_email,
            from: `Support Team <info@smartupweb.com>`,
            subject: `New Ticket Created with (ID: ${newTicket_id}`,
            template: './layout',
            context: {
                engineer_name: engineer_name,
                customer_name: c_name,
                issue_description: issue_description,
                priority: priority,
                newTicket_id: newTicket_id,
                baseUrl: baseUrl
            }
        })
    }

    public async sendEmailToAgentAfterRequest(data: NewRequestEmailData) {
        const { agentEmail, agentName, requestType, request_id } = data
        const baseUrl = process.env.BASE_URL
        await this.mailerService.sendMail({
            to: agentEmail,
            from: `Support Team <info@smartupweb.com>`,
            subject: `New Request with (ID: ${request_id})`,
            template:'./layout',
            context: {
                agentName: agentName,
                request_id: request_id,
                requestType: requestType === 'payed_leave' ? 'payed Leave' : "Stats Update",
                baseUrl: baseUrl
            }
        })
    }

    public async sendEmailForAgentRequestToSV(data: AgentRequestToSVEmailData) {
        const { agentEmail, agentName, agentIdRequested, agentEmailRequested, requestType, request_id } = data 
        const baseUrl = process.env.BASE_URL
        await this.mailerService.sendMail({
            to: agentEmail,
            from: `Support Team <info@smartupweb.com>`,
            subject: `New Request with (ID: ${request_id})`,
            template: './layout',
            context: {
                SVAgentName: agentName,
                request_id: request_id,
                requestType: requestType === RequestType.PAYED_LEAVE ? 'payed Leave' : "Stats Update",
                baseUrl: baseUrl,
                agentIdRequested: agentIdRequested,
                agentEmailRequested: agentEmailRequested
            }
        })
    }

    public async sendEmailForUpdateValidToAgent(data: UpdateValidationEmailData) {
        const { agentId, agentName, agentEmail, request_id,  requestType, issued_at, request_status } = data
        const baseUrl = process.env.BASE_URL
        const issuedAtFormatted = new Date(issued_at).toLocaleDateString('en-GB', {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        })
        await this.mailerService.sendMail({
            to: agentEmail,
            from: `Support Team <info@smartupweb.com>`,
            subject: `Request with (ID: ${request_id}) awaiting validation by you`,
            template: './layout',
            context: {
                agentId: agentId,
                agentNameRequested: agentName,
                request_id: request_id,
                requestType: requestType === RequestType.PAYED_LEAVE ? 'Payed Leave' : "Stats Update",
                issued_at: issuedAtFormatted,
                request_status: request_status === RequestStatus.APPROVED ? 'approved' : 'rejected',
                baseUrl: baseUrl
            }
        })
    }
}
