import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import { TicketService } from './provider/ticket.service';
import { CreateTicketDto } from './dtos/create-ticket.dto';
import { Request, Response } from 'express';
import { UpdateTicketStatusDto } from './dtos/update-ticket.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AddCommentDto } from 'src/comments/dtos/add_comment.dto';
import { SortTicketsDto } from './dtos/sort-tickets.dto';
import { getTicketsToSort } from 'utils/getTicketsToSort';
import { IsPublic } from 'src/authentication/decorators/is-public.decorator';
import { Action } from 'src/app/decorators/action.decorator';
import { Notification_action } from 'src/app/enums/notification_action.enum';
import { Notification_ownAction } from 'src/app/enums/notification_ownAction.enum';
import prisma from 'prisma/prisma_Client';

@Controller('tickets')
@ApiTags('Tickets')
export class TicketController {
    constructor(private readonly ticketService: TicketService) {}

    @ApiBearerAuth()
    @Post()
    //@Action([ Notification_action.CREATED_TICKET, Notification_ownAction.CREATED_TICKET ])
    @ApiOperation({ summary: 'Use this endpoint to create a ticket, and also send a new email to the engineer assigned with it, based on the body. If there is no engineerId handed, it automatically checks and assigns from the database the engineers specialised in a single category analogical to the level of priority. If there are not enough, it returns the total.' })
    @ApiBody({
        description: 'Fill the body requirements as shown below',
        schema: { type: 'object', properties: {
            c_name: { type: 'string', example: 'Jack', description: 'The name of the client issued the ticket for' },
            issue_description: { type: 'string', example: 'abcdefghabcdefghabcdefghabcdefgh123456789', description: 'A text area for the issue description'},
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'An enum for the priority level of the ticket issued, use the example options as shown'},
            categoryName: { type: 'string', example: 'billing', description: 'A category summary of the ticket issued, maybe you need to create a category first if you cannot find one you need'},
            status: { type: 'string', default: 'pending', description: 'An enum for the status of the ticket issued, use the example options as shown'},
            featuredImageUrl: { type: 'string/url', example: 'http://localhost.com/images/image1.jpg', description: 'An image url for the ticket' },
            due_date: { type: 'date', example: '2024-12-25 10:05:18.053', description: 'The date which the ticket should be evaluated and solved by an engineer' },
            engineerIds: { type: 'array', items: { type: 'string', format: 'uuid', example: '102fcad9-6ac3-4151-aa27-49c0726609a6' }, description: 'The ID of an user (engineer). It can also be an array of multiple engineer IDs, dependent on the ticket you are creating. Optional.' },
            dependent_ticketCustomId: { type: 'string', example: 'BI-000010', description: 'The ID of a different ticket, dependent on the one you are creating. Optional.' }
        }, required: ['c_name', 'priority', 'status', 'categoryName'] }, })
    @ApiResponse({ status: 201, description: 'A ticket is created successfully and gets stored in the database' })
    @ApiResponse({ status: 400, description: 'Bad request. Could not create that ticket'})
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async createTicket(@Body() createTicketDto: CreateTicketDto, @Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub

        console.log('Φτιαχνεις ενα ticket')
        const ticketCreated = await this.ticketService.createTicket(createTicketDto, userId)
        console.log('New ticket:', ticketCreated)
        
        if (ticketCreated) {
            res.locals.ticketCreated = ticketCreated
            console.log('ticket was created')
            return res.status(201).json(ticketCreated)
        }
        else return res.status(400).json({ message: 'The ticket was not created, check the body' })
    } 

    @ApiBearerAuth()
    @Patch(':customTicketId/assign_eng')
    @ApiOperation({ summary: 'Use this endpoint to assign a ticket to an engineer, and also send a new email based on the body' })
    @ApiParam({
        name: 'customTicketId', 
        schema: { type: 'string', example: 'BI-000010', description: 'Parameter for the api. The custom ID of the ticket' }
    })
    @ApiBody({
        description: 'Fill the body requirements as shown below',
        schema: { type: 'object', properties: {
            engineerIds: { type: 'array', items: { type: 'string', format: 'uuid', example: '49ce5736-8a36-43de-826c-d141fcd53a3a' }, description: 'The ID of an user (engineer). It can also be an array of multiple engineer IDs, dependent on the ticket you are creating.' },
        }, required: ['engineerIds'] }, })
    @ApiResponse({ status: 200, description: 'A ticket is assigned successfully to an engineer and gets stored in the database' })
    @ApiResponse({ status: 400, description: 'Bad request. Could not assign that ticket'})
    @ApiResponse({ status: 404, description: 'Not found. Could not find that ticket or the engineer.'})
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async assignTicketToEng(@Param('customTicketId') customTicketId: string, @Body() body: { engineerIds: string[] }, @Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub
        
        console.log('Kάνεις ενα ticket assign σε engineer(s)')
        const ticketAssigned = await this.ticketService.assignTicketToEng(customTicketId, body.engineerIds, userId)
        const engineersAssigned = await prisma.user.findMany({ where: { userId: { in: body.engineerIds } } })
        const engineersNames = engineersAssigned.map(eng => eng.userName)
    
        if (ticketAssigned) {
            console.log('ticket was assigned')
            return res.status(200).json({ message: `The ticket (ID: ${customTicketId}) was assigned to the engineer/s (Name/s: ${engineersNames.join(', ')})`})
        }  else return res.status(400).json({ message: 'The ticket was not assigned, check the body' })
    }

    @ApiBearerAuth()
    @Patch(':customTicketId/un-assign_eng')
    @ApiOperation({ summary: 'Use this endpoint to un-assign a ticket from a number of engineers, and also send a new email based on the body' })
    @ApiParam({
        name: 'customTicketId', 
        schema: { type: 'string', example: 'BI-000010', description: 'Parameter for the api. The custom ID of the ticket' }
    })
    @ApiBody({
        description: 'Fill the body requirements as shown below',
        schema: { type: 'object', properties: {
            engineerIds: { type: 'array', items: { type: 'string', format: 'uuid', example: '49ce5736-8a36-43de-826c-d141fcd53a3a' }, description: 'The ID of an user (engineer). It can also be an array of multiple engineer IDs, dependent on the ticket you are creating.' },
        }, required: ['engineerIds'] }, })
    @ApiResponse({ status: 200, description: 'A ticket is un-assigned successfully from a number of engineers. Returns a string message.' })
    @ApiResponse({ status: 400, description: 'Bad request. Could not un-assign that ticket'})
    @ApiResponse({ status: 404, description: 'Not found. Could not find that ticket or the engineer.'})
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async unAssignTicketToEng(@Param('customTicketId') customTicketId: string, @Body() body: { engineerIds: string[] }, @Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub
        
        console.log('Kάνεις un-assign engineer(s) απο καποιο ticket')
        const ticketUnAssigned = await this.ticketService.unAssignTicketFromEng(customTicketId, body.engineerIds, userId)
    
        if (ticketUnAssigned) {
            console.log('ticket was assigned')
            return res.status(200).json({ message: `${ticketUnAssigned}`})
        }  else return res.status(400).json({ message: 'The ticket was not assigned, check the body' })
    }

    @ApiBearerAuth()
    @Get()
    @ApiOperation({ summary: 'Use this endpoint to fetch all tickets from the database sorted by default by the newest created_at Date to the latest, with extra sorting available.' })
    @ApiQuery({
        name: 'orderBy',
        required: false,
        description: 'The field by which the tickets will be sorted',
        schema: {
            type: 'string',
            enum: ['c_name', 'company', 'c_email', 'c_telNumber', 'customerId', 'issue_description', 'priority', 'categoryName', 'categoryId', 'status', 'created_at', 'updated_at', 'customTicketId'],
            example: 'c_name',
        },
        example: 'http://192.168.1.160:8000/tickets?orderBy=status&direction=DESC'
    })
    @ApiQuery({
        name: 'direction',
        required: false,
        description: 'The sorting direction. Either "ASC" for ascending or "DESC" for descending, can be optional.',
        schema: {
            type: 'string',
            enum: ['ASC', 'DESC'],
            example: 'ASC',
        },
        example: 'http://192.168.1.160:8000/tickets?direction=ASC'
    })
    @ApiQuery({
        name: 'pageSize',
        required: false,
        description: 'The number of tickets that will appear in one page',
        schema: {
            type: 'number',
            default: '8',
        },
        example: 'http://192.168.1.160:8000/tickets?orderBy=status&direction=DESC&pageSize=8'
    })
    @ApiQuery({
        name: 'page',
        required: false,
        description: 'The number of pages for all tickets',
        schema: {
            type: 'number',
            default: '1',
        },
        example: 'http://192.168.1.160:8000/tickets?orderBy=status&direction=DESC&pageSize=8&page=1'
    })
    @ApiResponse({ status: 200, description: 'All the tickets were fetched successfully' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'No tickets were found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })  
    public async getAllTickets(@Query() sortTicketsDto: SortTicketsDto, @Req() req: Request, @Res() res: Response) {
        console.log('Εδω παιρνεις ολα τα tickets')
        const user = req.res.locals.user
        const userId = user.sub

       /*  const ticketMetadata = await this.ticketService.getAllTickets(sortTicketsDto, userId)
        const sortedTickets = await getTicketsToSort(sortTicketsDto, ticketMetadata.data)

        if (sortedTickets && sortedTickets.length > 0) {
            return res.status(200).json(sortedTickets)
        } else if (ticketMetadata && ticketMetadata.data.length > 0) {
            console.log('Τα tickets φτασανε')
            console.log('Tο συνολο τους:', ticketMetadata.data.length)
            return res.status(200).json(ticketMetadata)
        } */

        const ticketMetadata = await this.ticketService.getAllTickets(sortTicketsDto, userId)
        const sortedTickets = await getTicketsToSort(sortTicketsDto, ticketMetadata)

        if (sortedTickets && sortedTickets.length > 0) {
            return res.status(200).json(sortedTickets)
        } else if (ticketMetadata && ticketMetadata.length > 0) {
            console.log('Τα tickets φτασανε')
            console.log('Tο συνολο τους:', ticketMetadata.length)
            return res.status(200).json(ticketMetadata)
        }
        else return res.status(404).json({ message: 'No tickets were found' })
    }

    @Get(':customTicketId')
    @IsPublic(true)
    @ApiOperation({ summary: 'Use this endpoint to fetch a ticket from the database' })
    @ApiParam({
        name: 'customTicketId', 
        schema: { type: 'string', example: 'BI-000010', description: 'Parameter for the api. The ID of the ticket' }
    })
    @ApiResponse({ status: 200, description: 'A ticket is fetched successfully' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'That ticket was not found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })  
    public async getSingleTicket(@Param('customTicketId') customTicketId: string, @Req() req: Request, @Res() res: Response) {
        console.log('Eδω παιρνεις το ταδε ticket')

        const singleTicket = await this.ticketService.getSingleTicket(customTicketId)
        
        if (singleTicket) {
            console.log('Οριστε το ticket', singleTicket)
            return res.status(200).json(singleTicket)
        } else {
            console.log(`Δεν υπαρχει αυτο το ticket με ID: ${customTicketId}`)
            return res.status(404).json({ message: 'That ticket was not found'})
        } 
    }

    @ApiBearerAuth()
    @Patch(':customTicketId')
    @ApiOperation({ summary: 'Use this endpoint to update a ticket status or priority plus make a comment, based on the body' })
    @ApiParam({
        name: 'customTicketId', 
        schema: { type: 'string', example: 'BI-000010', description: 'Parameter for the api. The ID of the ticket' }
    })
    @ApiBody({
        description: 'Fill the body requirements as shown below',
        schema: { type: 'object', properties: {
            status: { type: 'string', enum: ['resolved', 'in_progress'], description: 'An enum for the status of the ticket issued, use the example options as shown'},
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'An enum for the priority level of the ticket issued, use the example options as shown'},
            comments: { 
                type: 'array', 
                items: { type: 'object', properties: { 
                    content: { type: 'string', example: 'The ticket was issued for ...'}
                }}, 
                examples: [
                {'content': 'That ticket is to be resolved next Thursday'}, 
                {'content': 'Could not resolve that ticket because of an app-breaking bug, etc..'} ]} }, 
        }, })
    @ApiResponse({ status: 200, description: 'A ticket is updated successfully and gets stored in the database' })
    @ApiResponse({ status: 400, description: 'Bad request. Could not create that ticket'})
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'That ticket was not found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async updateTicketStatus(@Param('customTicketId') customTicketId: string, @Body() updateTicketStatusDto: UpdateTicketStatusDto, @Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub

        updateTicketStatusDto.customTicketId = customTicketId
        console.log('Ενημερωνεις ενα ticket status/priority')
        const ticketUpdated = await this.ticketService.updateTicketStatusPriority(updateTicketStatusDto, userId)

        if (ticketUpdated) {
            console.log('Updated ticket:', ticketUpdated)
            console.log('ticket was updated')
            return res.status(200).json(ticketUpdated)
        }  else return res.status(400).json({ message: 'The ticket was not updated, check the body' })
    }

    @ApiBearerAuth()
    @Post(':customTicketId/comments')
    @ApiOperation({ summary: 'Use this endpoint to create a comment based on the body' })
    @ApiParam({
        name: 'customTicketId', 
        schema: { type: 'string', example: 'BI-000010', description: 'Parameter for the api. The ID of the ticket' }
    })
    @ApiBody({
        description: 'Fill the body requirements as shown below',
        schema: { type: 'object', properties: {
            content: { type: 'string', example: 'The ticket was issued for ...', description: 'A text area for the content of the comment, for the ticket issued.'},
        } }, })
    @ApiResponse({ status: 201, description: 'A comment is created successfully and gets stored in the database' })
    @ApiResponse({ status: 400, description: 'Bad request. Could not create that comment'})
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'That ticket was not found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async addCommentForTicket(@Param('customTicketId') customTicketId: string, @Body() addCommentDto: AddCommentDto, @Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub

        addCommentDto.customTicketId = customTicketId 

        console.log('Δημιουργεις ενα comment για ticket')
        const newComment = await this.ticketService.addNewCommentForTicket(addCommentDto, userId)

        console.log('New Comment:', newComment)
        console.log('comment was created')

        if (newComment) return res.status(201).json(newComment)
        else return res.status(400).json({ message: 'The comment was not created, check the content' })
    }
    
    @ApiBearerAuth()
    @Get('reports/metrics')
    @ApiOperation({ summary: 'Use this endpoint to fetch metrics of all tickets from the database' })
    @ApiResponse({ status: 200, description: 'All the tickets metrics were fetched successfully, *** avgResolutionTime is in hours *** ', example: '{ "ticketVolume": 150, "avgResolutionTime": 3.5, "openTickets": 20, "resolvedTickets": 130 }' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'No tickets metrics were found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })  
    public async getTicketsMetrics(@Req() req: Request, @Res() res: Response) {
        console.log('Εδω βλεπεις τα metrics για τα tickets')
        const user = req.res.locals.user
        const userId = user.sub

        const ticketMetrics = await this.ticketService.getTicketsMetrics(userId)
        console.log('Οριστε τα metrics')

        return res.status(200).json(ticketMetrics)
    }

    //@Action([ Notification_action.CANCELLED_TICKET, Notification_ownAction.CANCELLED_TICKET ])
    @ApiBearerAuth()
    @Patch(':customTicketId/cancel_ticket')
    @ApiOperation({ summary: 'Use this endpoint to cancel a ticket. Should work as "Resolve a ticket"' })
    @ApiParam({
        name: 'customTicketId', 
        schema: { type: 'string', example: 'BI-000010', description: 'Parameter for the api. The ID of the ticket' }
    })
    @ApiResponse({ status: 201, description: 'A ticket is cancelled successfully and gets stored in the database' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'That ticket was not found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async cancelTicket(@Param('customTicketId') customTicketId: string, @Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub

        console.log('Κανεις ενα ticket cancel')
        const ticketCancelled = await this.ticketService.cancelTicket(customTicketId, userId)
        console.log('Ticket was cancelled')

        return res.status(200).json({ message: `The ticket ${customTicketId} was cancelled`, ticketCancelled })
    }

    //@Action([ Notification_action.RE_OPEN_TICKET, Notification_ownAction.RE_OPEN_TICKET ])
    @ApiBearerAuth()
    @Patch(':customTicketId/reopen_ticket')
    @ApiOperation({ summary: 'Use this endpoint to re-open a cancelled ticket. Should work as "Resolve a ticket"' })
    @ApiParam({
        name: 'customTicketId', 
        schema: { type: 'string', example: 'BI-000010', description: 'Parameter for the api. The ID of the ticket' }
    })
    @ApiResponse({ status: 201, description: 'A cancelled ticket is re-opened successfully and gets stored in the database' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'That ticket was not found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async re_openTicket(@Param('customTicketId') customTicketId: string, @Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub

        console.log('Κανεις ενα ticket re-open')
        const ticketCancelled = await this.ticketService.cancelTicket(customTicketId, userId)
        console.log('Ticket was re-opened')

        return res.status(200).json({ message: `The ticket ${customTicketId} was re-opened`, ticketCancelled })
    }
}
