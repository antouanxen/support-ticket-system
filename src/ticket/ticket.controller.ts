import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import { TicketService } from './provider/ticket.service';
import { CreateTicketDto } from './dtos/create-ticket.dto';
import { Request, Response } from 'express';
import { UpdateTicketStatusDto } from './dtos/update-ticket.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AddCommentDto } from 'src/comments/dtos/add_comment.dto';
import { Status } from './enum/status.enum';
import { SortTicketsDto } from './dtos/sort-tickets.dto';
import { getTicketsToSort } from 'utils/getTicketsToSort';
import { IsPublic } from 'src/authentication/decorators/is-public.decorator';
import { AssignTicketToEngDto } from './dtos/assignTicket-toEng.dto';

@Controller('tickets')
@ApiTags('Tickets')
export class TicketController {
    constructor(private readonly ticketService: TicketService) {}

    @ApiBearerAuth()
    @Post()
    @ApiOperation({ summary: 'Use this endpoint to create a ticket, and also send a new email to the engineer assigned with it, based on the body' })
    @ApiBody({
        description: 'Fill the body requirements as shown below',
        schema: { type: 'object', properties: {
            c_name: { type: 'string', example: 'Abcd', description: 'The name of the client issued the ticket for' },
            issue_description: { type: 'string', example: 'abcdefghabcdefghabcdefghabcdefgh123456789', description: 'A text area for the issue description'},
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'An enum for the priority level of the ticket issued, use the example options as shown'},
            categoryName: { type: 'string', example: 'billing', description: 'A category summary of the ticket issued, maybe you need to create a category first if you cannot find one you need'},
            status: { type: 'string', default: 'pending', description: 'An enum for the status of the ticket issued, use the example options as shown'},
            featuredImageUrl: { type: 'string/url', example: 'http://localhost.com/images/image1.jpg', description: 'An image url for the ticket' },
            engineer_id: { type: 'string', format: 'uuid', example: '92a04c73-05b2-4cd5-9513-66e623c6a41a', description: 'An ID of a engineer, dependent on the ticket you are creating.' },
            dependent_ticketId: { type: 'string', format: 'uuid', example: '15c2956b-1d27-4282-89da-d83dd7b44a49', description: 'An ID of a different ticket, dependent on the one you are creating.' }
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
            console.log('ticket was created')
            return res.status(201).json(ticketCreated)
        }
        else return res.status(400).json({ message: 'The ticket was not created, check the body' })
    } 

    @ApiBearerAuth()
    @Post(':ticketId/assign_eng')
    @ApiOperation({ summary: 'Use this endpoint to assign a ticket to an engineer, and also send a new email based on the body' })
    @ApiParam({
        name: 'ticketId', 
        schema: { type: 'string', format: 'UUID', example: 'ab84004b-bad6-4e0f-8b4c-b50b45bf95a0', description: 'Parameter for the api. The ID of the ticket' }
    })
    @ApiBody({
        description: 'Fill the body requirements as shown below',
        schema: { type: 'object', properties: {
            engineerId: { type: 'string', format: 'uuid', example: '92a04c73-05b2-4cd5-9513-66e623c6a41a', description: 'An ID of a engineer, dependent on the ticket you are creating.' }
        }, required: ['engineerId'] }, })
    @ApiResponse({ status: 200, description: 'A ticket is assigned successfully to an engineer and gets stored in the database' })
    @ApiResponse({ status: 400, description: 'Bad request. Could not assign that ticket'})
    @ApiResponse({ status: 404, description: 'Not found. Could not find that ticket or the engineer.'})
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async assignTicketToEng(@Param('ticketId') ticketId: string, @Body() assignTicketToEngDto: AssignTicketToEngDto, @Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub

        assignTicketToEngDto.ticket_id = ticketId
        console.log('Kάνεις ενα ticket assign σε εναν engineer')
        const ticketAssigned = await this.ticketService.assignTicketToEng(assignTicketToEngDto, userId)

        if (ticketAssigned) {
            console.log('ticket was assigned')
            return res.status(200).json({ message: `The ticket (ID: ${assignTicketToEngDto.ticket_id}) was assigned to the engineer (ID: ${assignTicketToEngDto.engineer_id})`})
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
            enum: ['c_name', 'company', 'c_email', 'c_telNumber', 'customerId', 'issue_description', 'priority', 'categoryName', 'categoryId', 'status', 'created_at', 'updated_at'],
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
    @ApiResponse({ status: 200, description: 'All the tickets were fetched successfully' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'No tickets were found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })  
    public async getAllTickets(@Query() sortTicketsDto: SortTicketsDto, @Req() req: Request, @Res() res: Response) {
        console.log('Εδω παιρνεις ολα τα tickets')
        const user = req.res.locals.user
        const userId = user.sub

        const ticketList = await this.ticketService.getAllTickets(sortTicketsDto, userId)
        const sortedTickets = await getTicketsToSort(sortTicketsDto, ticketList)

        if (sortedTickets && sortedTickets.length > 0) {
            return res.status(200).json(sortedTickets)
        } else if (ticketList && ticketList.length > 0) {
            console.log('Τα tickets φτασανε')
            console.log('Tο συνολο τους:', ticketList.length)
            return res.status(200).json(ticketList)
        }
        else return res.status(404).json({ message: 'No tickets were found' })
    }

    @Get(':ticketId')
    @IsPublic(true)
    @ApiOperation({ summary: 'Use this endpoint to fetch a ticket from the database' })
    @ApiParam({
        name: 'ticketId', 
        schema: { type: 'string', format: 'UUID', example: '935e1da5-2320-42eb-ba6d-8ef57471f8c4', description: 'Parameter for the api. The ID of the ticket' }
    })
    @ApiResponse({ status: 200, description: 'A ticket is fetched successfully' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'That ticket was not found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })  
    public async getSingleTicket(@Param('ticketId') ticketId: string, @Req() req: Request, @Res() res: Response) {
        console.log('Eδω παιρνεις το ταδε ticket')

        const singleTicket = await this.ticketService.getSingleTicket(ticketId)
        
        if (singleTicket) {
            console.log('Οριστε το ticket', singleTicket)
            return res.status(200).json(singleTicket)
        }   
        else {
            console.log(`Δεν υπαρχει αυτο το ticket με ID: ${ticketId}`)
            return res.status(404).json({ message: 'That ticket was not found'})
        } 
    }

    @ApiBearerAuth()
    @Patch(':ticketId')
    @ApiOperation({ summary: 'Use this endpoint to update a ticket status plus make a comment, based on the body' })
    @ApiParam({
        name: 'ticketId', 
        schema: { type: 'string', format: 'UUID', example: '935e1da5-2320-42eb-ba6d-8ef57471f8c4', description: 'Parameter for the api. The ID of the ticket' }
    })
    @ApiBody({
        description: 'Fill the body requirements as shown below',
        schema: { type: 'object', properties: {
            status: { type: 'string', enum: ['resolved', 'in_progress'], description: 'An enum for the status of the ticket issued, use the example options as shown'},
            comments: { 
                type: 'array', 
                items: { type: 'object', properties: { 
                    content: { type: 'string', example: 'The ticket was issued for ...'}
                }}, 
                examples: [
                {'content': 'That ticket is to be resolved next Thursday'}, 
                {'content': 'Could not resolve that ticket because of an app-breaking bug, etc..'} ]} }, 
                required: ['status'] }, })
    @ApiResponse({ status: 200, description: 'A ticket is updated successfully and gets stored in the database' })
    @ApiResponse({ status: 400, description: 'Bad request. Could not create that ticket'})
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'That ticket was not found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async updateTicketStatus(@Param('ticketId') ticketId: string, @Body('status') status: Status, @Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub

        const updateTicketStatusDto: UpdateTicketStatusDto = { ticketId, status }
        console.log('Ενημερωνεις ενα ticket')
        const ticketUpdated = await this.ticketService.updateTicketStatus(updateTicketStatusDto, userId)

        if (ticketUpdated) {
            console.log('Updated ticket:', ticketUpdated)
            console.log('ticket was updated')
            return res.status(200).json(ticketUpdated)
        }  else return res.status(400).json({ message: 'The ticket was not updated, check the body' })
    }

    @ApiBearerAuth()
    @Post(':ticketId/comments')
    @ApiOperation({ summary: 'Use this endpoint to create a comment based on the body' })
    @ApiParam({
        name: 'ticketId', 
        schema: { type: 'string', format: 'UUID', example: '3f023517-3320-485e-bd0e-308dd0a6545c', description: 'Parameter for the api. The ID of the ticket' }
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
    public async addCommentForTicket(@Param('ticketId') ticketId: string, @Body() addCommentDto: AddCommentDto, @Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub

        addCommentDto.ticketId = ticketId 

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
}