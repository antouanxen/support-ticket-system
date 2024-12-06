import { Body, Controller, Delete, Get, Param, Patch, Post, Req, Res } from '@nestjs/common';
import { RequestPermissionService } from './provider/request-permission.service';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequestForLeaveDto } from './dtos/requestForLeave.dto';
import { Request, Response } from 'express';
import { RequestForAgentUpdateDto } from './dtos/requestForAgentUpdate.dto';
import { SeenRequestDto } from './dtos/seenRequest.dto';
import { Roles } from 'src/authentication/decorators/roles.decorator';
import { AuthRoles } from 'src/authentication/enums/roles.enum';
import { RequestType } from './enums/requestType.enum';
import { IsPublic } from 'src/authentication/decorators/is-public.decorator';

@Controller('requests/permissions')
@ApiTags('Request-permissions')
export class RequestPermissionController {
    constructor(
        private readonly requestPermissionService: RequestPermissionService
    ) {}

    @ApiBearerAuth()
    @Post('request_for_leave')
    @ApiOperation({ summary: 'Use this endpoint to create a request for payed leave, and also send an email to the agent after his request, based on the body. You ll need to first create a relation between an agent and a supervisor' })
    @ApiBody({
        description: 'Fill the body requirements as shown below',
        schema: { type: 'object', properties: {
            numberOfdays: { type: 'number', example: '6', description: 'Number of days for the payed leave for the agent making the request' },
            request_status: { type: 'string', default: 'pending', description: 'The status of the request, default is always pending.'},
            requestType: { type: 'string', default: 'payed_leave', description: 'The type of request, default is always payed_leave.'},
            //supervisorId: { type: 'string', format: 'UUID', example: 'ff4cb519-7a04-4bb3-8610-37fbf49226ec', description: 'The ID of the supervisor' }
        }, required: ['numberOfDays'] }, })
    @ApiResponse({ status: 201, description: 'A new role is created successfully and is stored in the database' })
    @ApiResponse({ status: 400, description: 'Bad request. Could not create that role'})
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async requestForLeave(@Body() requestForLeaveDto: RequestForLeaveDto, @Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub

        console.log('Φτιαχνεις εναν νεο request για leave')
        const requestForLeave = await this.requestPermissionService.requestForLeave(requestForLeaveDto, userId)
        console.log('New request:', requestForLeave)

        if (requestForLeave) {
            console.log('A new request for leave has been created')
            res.status(201).json({ message: 'You have made a new request for leave, awaiting permission', requestForLeave })
        }
        else return res.status(400).json({ message: 'The request for leave was not created, check the body' })
    }

    @ApiBearerAuth()
    @Post('request_agent_update')
    @ApiOperation({ summary: 'Use this endpoint to create a request for agent stats update, and also send an email to the agent based on his request, based on the body. You ll need to first create a relation between an agent and a supervisor' })
    @ApiBody({
        description: 'Fill the body requirements as shown below',
        schema: { type: 'object', properties: {
            agentName: { type: 'string', example: 'Jenny', description: 'The new name update for the agent making the request' },
            agentEmail: { type: 'string', example: 'jenn@y.com', description: 'The new email update for the agent making the request' },
            agentPassword: { type: 'string', example: 'Possword124#', description: 'The new password update for the agent making the request' },
            request_status: { type: 'string', default: 'pending', description: 'The status of the request, default is always pending.'},
            requestType: { type: 'string', default: 'payed_leave', description: 'The type of request, default is always payed_leave.'}
        }, }, })
    @ApiResponse({ status: 201, description: 'A new role is created successfully and is stored in the database' })
    @ApiResponse({ status: 400, description: 'Bad request. Could not create that role'})
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async requestForAgentStatsUpdate(@Body() requestForAgentUpdateDto: RequestForAgentUpdateDto, @Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub

        console.log('Φτιαχνεις εναν νεο request για agent stats update')
        const requestForLeave = await this.requestPermissionService.requestForStatsUpdate(requestForAgentUpdateDto, userId)
        console.log('New request:', requestForLeave)

        if (requestForLeave) {
            console.log('A new request for agent stats update has been created')
            res.status(201).json({ message: 'You have made a new request for agent stats update, awaiting permission', requestForLeave })
        }
        else return res.status(400).json({ message: 'The request for agent stats update was not created, check the body' })
    }

    @ApiBearerAuth()
    @Patch(':requestId/process_requests')
    //@Roles([AuthRoles.ADMIN, AuthRoles.MODERATOR, AuthRoles.SUPERVISOR])
    @ApiOperation({ summary: 'Use this endpoint to update a request status based on the body || ** Roles: Admin, Moderator, Supervisor **' })
    @ApiParam({
        name: 'requestId', 
        schema: { type: 'string', format: 'UUID', example: '30ec6506-5623-47cf-b4f2-8f8b45f27216', description: 'Parameter for the api. The id of the request' }
    })
    @ApiBody({
        description: 'Fill the body requirements as shown below',
        schema: { type: 'object', properties: {
            request_status: { type: 'string', enum: ['approved', 'rejected'], description: 'The description of the request whether it is approved or rejected by the mod or supervisor'},
        }} })
    @ApiResponse({ status: 200, description: 'A request is processed' })
    @ApiResponse({ status: 400, description: 'Could not update request status, check the body'})
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'That request was not found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async seenAndProcessRequest(@Param('requestId') requestId: string, @Body() seenRequestDto: SeenRequestDto, @Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub

        console.log('Βλεπεις ενα request για user που θελει process και update')
        seenRequestDto.request_id = requestId

        const processedRequest = await this.requestPermissionService.seenAndProcessRequestStatus(seenRequestDto, userId)

        if (processedRequest && processedRequest.requestType === RequestType.AGENT_UPDATE_STATS) {
            console.log(`You have processed a request for an agent's stats update with an ID: ${processedRequest.requestForAgent}`)
            res.status(200).json({ message: `You have processed a pending request for an agent's stats update with an ID: ${processedRequest.requestForAgent}`, processedRequest })
        } else if (processedRequest && processedRequest.requestType === RequestType.PAYED_LEAVE) {
            console.log(`You have processed a request for an agent's payed leave with an ID: ${processedRequest.requestForAgent}`)
            res.status(200).json({ message: `You have processed a pending request for an agent's payed leave with an ID: ${processedRequest.requestForAgent}`, processedRequest })
        }
        else return res.status(400).json({ message: 'The request did not pass through, check the body.' })
    }

    @ApiBearerAuth()
    @Get('pending_requests')
    //@Roles([AuthRoles.ADMIN, AuthRoles.MODERATOR, AuthRoles.SUPERVISOR])
    @ApiOperation({ summary: 'Use this endpoint to fetch all pending requests from the database || ** Roles: Admin, Moderator, Supervisor **' })
    @ApiResponse({ status: 200, description: 'All the pending requests were fetched successfully' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'No pending requests were found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' }) 
    public async getAllPendingRequests(@Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub
        console.log('Βλεπεις ολα τα requests που περιμενουν process και update')

        const allPendingRequests = await this.requestPermissionService.getAllPendingRequests(userId)

        if (allPendingRequests && allPendingRequests.length > 0) {
            console.log('All pending requests for process')
            res.status(200).json({ message:` All pending requests,(${allPendingRequests.length}), awaiting permission`, allPendingRequests })
        }
        else return res.status(404).json({ message: 'No pending requests were found.' })
    }

    @ApiBearerAuth()
    @Get('requests_admin_check')
    //@Roles([AuthRoles.ADMIN, AuthRoles.MODERATOR])
    @ApiOperation({ summary: 'Use this endpoint to fetch all processed requests from the database || ** Roles: Admin, Moderator **' })
    @ApiResponse({ status: 200, description: 'All the processed requests were fetched successfully' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'No processed requests were found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' }) 
    public async getAllSeenRequestsForAdmin(@Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub
        console.log('Βλεπεις ολα τα requests που εχουν δεχθει process και update')

        const allSeenRequests = await this.requestPermissionService.getAllSeenRequestsForAdmin(userId)

        if (allSeenRequests && allSeenRequests.length > 0) {
            console.log('All processed requests for the admin to check on')
            res.status(200).json({ message: 'All seen and processed requests, for admin to check on.', allSeenRequests })
        }
        else return res.status(404).json({ message: 'No seen and processed requests were found.' })
    }

    @Get(':requestId')
    @IsPublic(true)
    @ApiOperation({ summary: 'Use this endpoint to fetch a single request from the database' })
    @ApiParam({
        name: 'requestId', 
        schema: { type: 'string', format: 'UUID', example: '8da819e1-f650-44f5-8ca3-df47fbc0b768', description: 'Parameter for the api. The ID of the request' }
    })
    @ApiResponse({ status: 200, description: 'A request is fetched successfully' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'That request was not found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })  
    public async getSingleRequest(@Param('requestId') requestId: string, @Req() req: Request, @Res() res: Response) {
        console.log('Eδω παιρνεις το ταδε request')

        const singleRequest = await this.requestPermissionService.findSingleRequest(requestId)
        
        if (singleRequest) {
            console.log('Οριστε το request', singleRequest)
            return res.status(200).json(singleRequest)
        }   
        else {
            console.log(`Δεν υπαρχει αυτο το request με ID: ${requestId}`)
            return res.status(404).json({ message: 'That request was not found'})
        } 
    }

    @ApiBearerAuth()
    @Delete()
    //([AuthRoles.ADMIN, AuthRoles.MODERATOR, AuthRoles.SUPERVISOR])
    @ApiOperation({ summary: 'Use this endpoint to delete the latest 5 requests from the database || ** Roles: Admin, Moderator, Supervisor **' })
    @ApiResponse({ status: 200, description: 'The last 5 requests deleted successfully' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'That agent or more than 5 requests were not found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async deleteSomeRequests(@Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub
        console.log('Εδω διαγραφεις τα τελευταια 5 reqs')

        await this.requestPermissionService.deleteRequests(userId)

        console.log('Διεγραψες τα τελευταια 5 requests, βαση ημερομηνιας.')
        res.status(200).json({ message: 'The last 5 requests by date got deleted from database.'})
    }
}
