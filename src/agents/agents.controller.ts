import { Body, Controller, Delete, Get, InternalServerErrorException, Param, Patch, Post, Req, Res } from '@nestjs/common';
import { AgentsService } from './provider/agents.service';
import { Request, Response } from 'express';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UpdateRoleForAgentDto } from './dtos/update-role_for_Agent.dto';
import { Roles } from 'src/authentication/decorators/roles.decorator';
import { AuthRoles } from 'src/authentication/enums/roles.enum';
import { IsPublic } from 'src/authentication/decorators/is-public.decorator';
import { AssignAgentDto } from './dtos/assignAgent.dto';
import axios from 'axios';
import { UpdateAgentStatsDto } from './dtos/update-agent.dto';

@Controller('agents')
@ApiTags('Agents')
export class AgentsController {
    constructor(
        private readonly agentService: AgentsService,
    ) {}

    @ApiBearerAuth()
    @Get()
    @ApiOperation({ summary: 'Use this endpoint to fetch all agents from the database' })
    @ApiResponse({ status: 200, description: 'All the agents were fetched successfully' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'No agents were found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })  
    public async getAllAgents(@Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub
        console.log('Εδω παιρνεις ολoυς τους agents')

        const agentsFullList = await this.agentService.getAllAgents(userId)

        if (agentsFullList && agentsFullList.length > 0) {
            console.log('Οι agents φτασανε')
            console.log('Tο συνολο τους:', agentsFullList.length)

            return res.status(200).json(agentsFullList)
        } else return res.status(404).json({ message: 'No agents were found' })
    }

    @ApiBearerAuth()
    @Get('roles')
    @ApiOperation({ summary: 'Use this endpoint to fetch all user-agents with roles from the database, excluding engineer-related roles' })
    @ApiResponse({ status: 200, description: 'All the agents with roles were fetched successfully' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'No agents with roles were found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })  
    public async getAllAgentsRoles(@Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub
        console.log('Εδω παιρνεις ολους τους agents με roles')

        const agentWithRolesList = await this.agentService.getAllAgentswithRoles(userId)

        if (agentWithRolesList && agentWithRolesList.length > 0) {
            console.log('Οι agents με roles φτασανε')
            console.log('Tο συνολο τους:', agentWithRolesList.length)

            return res.status(200).json(agentWithRolesList)
        } else return res.status(404).json({ message: 'No agents with roles were found' })
    }

    @ApiBearerAuth()
    @Get('logs')
    //@Roles([AuthRoles.ADMIN, AuthRoles.MODERATOR, AuthRoles.SUPERVISOR])
    @ApiOperation({ summary: 'Use this endpoint to fetch all agents logs except from admins, from the database || ** Roles: Admin, Moderator, Supervisor **' })
    @ApiResponse({ status: 200, description: 'All the agents logs were fetched successfully' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'No agents logs were found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })  
    public async getAllAgentsLogs(@Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub
        console.log('Εδω παιρνεις ολα τα logs των agents')
        
        const agentsLogsList = await this.agentService.getAllAgentsLogs(userId)

        if (agentsLogsList && agentsLogsList.length > 0) {
            console.log('Τα logs των agents φτασανε')
            console.log('Tο συνολο τους:', agentsLogsList.length)

            return res.status(200).json(agentsLogsList)
        } else return res.status(404).json({ message: 'No agents logs were found' })
    }

    @Get(':agentId')
    @IsPublic(true)
    @ApiOperation({ summary: 'Use this endpoint to fetch a single agent from the database ' })
    @ApiParam({
        name: 'agentId', 
        schema: { type: 'string', format: 'UUID', example: '470ebd63-b60b-4b5f-b3f9-4e9728c8341a', description: 'Parameter for the api. The ID of the agent' }
    })
    @ApiResponse({ status: 200, description: 'A single agent was fetched successfully' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'That agent was not found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })  
    public async getSingleAgent(@Param('agentId') agentIdToFind: string, @Req() req: Request, @Res() res: Response) {
        console.log('Εδω παιρνεις τον ταδε agent')

        const singleAgent = await this.agentService.getSingleAgent(agentIdToFind)

        if (singleAgent) {
            console.log('Οριστε ο ταδε agent', singleAgent)
            return res.status(200).json(singleAgent)
        } else return res.status(404).json({ message: 'That agent was not found' })
    }

    @ApiBearerAuth()
    @Post(':agentId/new_assign')
    @ApiOperation({ summary: 'Use this endpoint to assign an agent to a supervisor, based on the body. || ** Roles: Admin, Moderator, Supervisor **' })
    @ApiParam({
        name: 'agentId', 
        schema: { type: 'string', format: 'UUID', example: '224f77e3-17b2-4521-a971-567b72653b4d', description: 'Parameter for the api. The ID of the agent' }
    })
    @ApiBody({
        description: 'Fill the body requirements as shown below',
        schema: { type: 'object', properties: {
            supervisorId: { type: 'string', format: 'UUID', example: 'ff4cb519-7a04-4bb3-8610-37fbf49226ec', description: 'Parameter for the api. The ID of the role' }
        }} })
    @ApiResponse({ status: 200, description: 'An agent was assigned to a supervisor agent successfully' })
    @ApiResponse({ status: 400, description: 'Bad request. Could not assign the agent'})
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'That agent was not found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async assignAgentToSV(@Param('agentId') agentIdToGetAssigned: string, @Body() assignAgentDto: AssignAgentDto, @Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub

        assignAgentDto.agentIdToGetAssigned = agentIdToGetAssigned

        console.log('Αναθετεις εναν agent σε ενα αλλον')
        const result = await this.agentService.assignAgentToSV(assignAgentDto, userId)

        if (result) {
            res.status(200).json({ message: 'The assignment completed successfully.' })
        }
        else return res.status(400).json({ message: 'The assignment did not complete. Try again.' })

    }

    @ApiBearerAuth()
    @Patch(':agentId/new_role')
    //@Roles([AuthRoles.ADMIN, AuthRoles.MODERATOR, AuthRoles.SUPERVISOR])
    @ApiOperation({ summary: 'Use this endpoint to update the role of an agent, based on the body. || ** Roles: Admin, Moderator, Supervisor **' })
    @ApiParam({
        name: 'agentId', 
        schema: { type: 'string', format: 'UUID', example: '224f77e3-17b2-4521-a971-567b72653b4d', description: 'Parameter for the api. The ID of the agent' }
    })
    @ApiBody({
        description: 'Fill the body requirements as shown below',
        schema: { type: 'object', properties: {
            role_description: { type: 'string', example: 'Moderator', description: 'A text area for the description of the role, for the ticket agent.'},
        }} })
    @ApiResponse({ status: 200, description: 'A role is updated successfully for an agent' })
    @ApiResponse({ status: 400, description: 'Bad request. Could not update the role for an agent'})
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'That role or agent was not found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async updateAgentRole(@Param('agentId') agentIdForRole: string, @Body() updateRoleDto: UpdateRoleForAgentDto, @Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub

        updateRoleDto.agentIdForRole = agentIdForRole

        console.log('Ενημερωνεις ενα role για εναν agent')
        const updatedRoleForAgent = await this.agentService.updateRoleForAgents(updateRoleDto, userId)

        if (updatedRoleForAgent && updatedRoleForAgent.role) {
            console.log(`the role for agent: '${updatedRoleForAgent.userName}', has updated to: '${updatedRoleForAgent.role.role_description}' ` )
            res.status(200).json({ message: `The role for agent: '${updatedRoleForAgent.userName}' has updated to: '${updatedRoleForAgent.role.role_description}' `})
        }
        else return res.status(400).json({ message: 'The role was not updated for the agent, check the body' })
    }

    @Post(':agentId/new_stats')
    @ApiOperation({ summary: 'Use this endpoint to update an agent with the request ID from the request body, password is not returned for safety reasons.' })
    @ApiParam({
        name: 'agentId', 
        schema: { type: 'string', format: 'UUID', example: '224f77e3-17b2-4521-a971-567b72653b4d', description: '1st Parameter for the api. The ID of the agent' }
    })
    @ApiParam({
        name: 'request_id', 
        schema: { type: 'string', format: 'UUID', example: '8da819e1-f650-44f5-8ca3-df47fbc0b768', description: '2nd Parameter for the api. The ID of the request' }
    })
    @ApiResponse({ status: 200, description: 'An agent stats is updated successfully and gets stored in the database' })
    @ApiResponse({ status: 400, description: 'Bad request. Could not update that agent'})
    @ApiResponse({ status: 404, description: 'That agent or request was not found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async updateAgent(@Param('agentId') agentId: string, @Body() updateAgentStatsDto: UpdateAgentStatsDto, @Req() req: Request, @Res() res: Response) {
        console.log('Ενημερωνεις ενος user agent τα stats')
        
        const agentUpdated = await this.agentService.updateAgentDetails(agentId, updateAgentStatsDto)

        if (agentUpdated) {
            console.log('Updated agent:', agentUpdated)
            console.log('user agent was updated')
            if ('agentName' in agentUpdated) return res.status(200).json({ message: `This agent: ${agentUpdated.agentName} got his stats updated.`, agentUpdated })
        }  else return res.status(400).json({ message: 'Something was wrong with the body, updating the user agent stats' })
    }
    
    /* @Post(':agentId/new_stats/:request_id')
    @IsPublic(true)
    @ApiOperation({ summary: 'Use this endpoint to update an agent with the request ID from the request body, password is not returned for safety reasons.' })
    @ApiParam({
        name: 'agentId', 
        schema: { type: 'string', format: 'UUID', example: '224f77e3-17b2-4521-a971-567b72653b4d', description: '1st Parameter for the api. The ID of the agent' }
    })
    @ApiParam({
        name: 'request_id', 
        schema: { type: 'string', format: 'UUID', example: '8da819e1-f650-44f5-8ca3-df47fbc0b768', description: '2nd Parameter for the api. The ID of the request' }
    })
    @ApiResponse({ status: 200, description: 'An agent stats is updated successfully and gets stored in the database' })
    @ApiResponse({ status: 400, description: 'Bad request. Could not update that agent'})
    @ApiResponse({ status: 404, description: 'That agent or request was not found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async updateAgent(@Param('agentId') agentId: string, @Param('request_id') request_id: string, @Req() req: Request, @Res() res: Response) {
        console.log('Ενημερωνεις εναν agent τα stats απο το εμαιλ')
        
        const agentUpdated = await this.agentService.updateAgentDetails(agentId, request_id)

        if (agentUpdated) {
            console.log('Updated agent:', agentUpdated)
            console.log('agent was updated by email')
            if ('agentName' in agentUpdated) return res.status(200).json({ message: `This agent: ${agentUpdated.agentName} got his stats updated.`, agentUpdated })
        }  else return res.status(500).json({ message: 'Failed to process the request' })
    }

    @ApiBearerAuth()
    @Get(':agentId/new_stats/:request_id/redirect')
    @ApiOperation({ summary: 'This endpoint is used to access the post api (":agentId/new_stats/:request_id"), accessible straight from the email sent to the agent who made the request.' })
    @ApiParam({
        name: 'agentId', 
        schema: { type: 'string', format: 'UUID', example: '224f77e3-17b2-4521-a971-567b72653b4d', description: '1st Parameter for the api. The ID of the agent' }
    })
    @ApiParam({
        name: 'request_id', 
        schema: { type: 'string', format: 'UUID', example: '8da819e1-f650-44f5-8ca3-df47fbc0b768', description: '2nd Parameter for the api. The ID of the request' }
    })
    @ApiResponse({ status: 200, description: 'An agent stats update is finished and gets redirected to his own profile page in the app' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed, gets redirected to "sign-in" page' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async redirectAfterPost(@Param('agentId') agentId: string, @Param('request_id') request_id: string, @Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub
        agentId = userId
        console.log('Κανεις πρωτα post στο αλλο api για τα stats του agent')

        if (!userId) return res.redirect(`${process.env.BASE_URL}/auth/sign_in`)

        try {
            const axiosResponse = await axios.post(`${process.env.BASE_URL}/agents/${agentId}/new_stats/${request_id}`)
    
            if (axiosResponse) {
                console.log('Κανεις redirect μετα απο την ενημερωση των stats ενος agent απο το εμαιλ')
                return res.redirect(`${process.env.BASE_URL}/agents/${agentId}`)
            }
        } catch (err) {
            console.log('error to redirect after post', err)
            throw new InternalServerErrorException('Failed to process the request. Try again')
        }
    } */

    @ApiBearerAuth()
    @Delete(':agentId')
   // @Roles([AuthRoles.ADMIN, AuthRoles.MODERATOR])
    @ApiOperation({ summary: 'Use this endpoint to delete a single agent || ** Roles: Admin, Moderator **' })
    @ApiParam({ name: 'agentId', schema: 
        { type: 'string', format: 'uuid', example: '224f77e3-17b2-4521-a971-567b72653b4d', description: 'Unique identifier for the resource' }, 
        required: true })
    @ApiResponse({ status: 200, description: 'Agent deleted successfully' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'That agent was not found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async deleteAgent(@Param('agentId') agentId: string, @Req()req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub
        console.log('Εδω διαγραφεις ενα agent')

        await this.agentService.deleteAnAgent(agentId, userId)

        console.log('Διεγραψες ενα agent')
        res.status(200).json({ message: 'That agent got deleted.'})
    }

}