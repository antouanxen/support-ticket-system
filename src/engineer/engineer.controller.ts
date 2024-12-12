import { Body, Controller, Delete, Get, Param, Patch, Post, Req, Res } from '@nestjs/common';
import { EngineerService } from './provider/engineer.service';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateEngineerDto } from './dtos/create-engineer.dto';
import { Request, Response } from 'express';
import { UpdateEngineerDto } from './dtos/update-engineer.dto';

@Controller('engineers')
@ApiTags('Engineers')
@ApiBearerAuth()
export class EngineerController {
    constructor(
        private readonly engineerService: EngineerService
    ) {}

    @Post()
    @ApiOperation({ summary: 'Use this endpoint to create an engineer based on the body. The user gets the role of "ENGINEER" automatically.' })
    @ApiBody({
        description: 'Fill the body requirements as shown below',
        schema: { type: 'object', properties: {
            engineer_name: { type: 'string', example: 'Joshua', description: 'A text area for the name of the engineer.'},
            engineer_email: { type: 'string', example: 'josh@ua.com', description: 'A text area for the email of the engineer.'},
            engineer_password: { type: 'string', example: 'Password123!', description: 'A text area for the password of the engineer.'},
        }, required: ['engineer_email', 'engineer_password'] }, })
    @ApiResponse({ status: 201, description: 'A new engineer is created successfully and is stored in the database' })
    @ApiResponse({ status: 400, description: 'Bad request. Could not create that engineer'})
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async createEngineer(@Body() createEngineerDto: CreateEngineerDto, @Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub

        console.log('Φτιαχνεις εναν νεο engineer')
        const engineerTobeCreated = await this.engineerService.createEngineer(createEngineerDto, userId)
        
        if (engineerTobeCreated) {
            console.log('New engineer:', engineerTobeCreated)
            console.log('A new engineer has been created')
            res.status(201).json(engineerTobeCreated)
        }
        else return res.status(400).json({ message: 'The engineer was not created, check the body' })
    }

    @Get()
    @ApiOperation({ summary: 'Use this endpoint to fetch all engineers from the database' })
    @ApiResponse({ status: 200, description: 'All the engineers were fetched successfully' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'No engineers were found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })  
    public async getAllEngineers(@Req() req: Request, @Res() res: Response) {
        console.log('Εδω παιρνεις ολα τους engineers')
        const user = req.res.locals.user
        const userId = user.sub

        const engineerList = await this.engineerService.findAllEngineers(userId)

        if (engineerList && engineerList.length > 0) {
            console.log('Οι engineers φτασανε')
            console.log('Tο συνολο τους:', engineerList.length)

            return res.status(200).json(engineerList)
        } else return res.status(404).json({ message: 'No engineers were found' })
    }

    @Get(':engineerId')
    @ApiOperation({ summary: 'Use this endpoint to fetch a single engineer by its ID from the database' })
    @ApiParam({
        name: 'engineerId', 
        schema: { type: 'string', format: 'UUID', example: '102fcad9-6ac3-4151-aa27-49c0726609a6', description: 'Parameter for the api. The ID of the engineer' }
    })
    @ApiResponse({ status: 200, description: 'A single engineer was fetched successfully' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'That engineer was not found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })  
    public async getSingleEngById(@Param('engineerId') engineerId: string, @Req() req: Request, @Res() res: Response) {
        console.log('Εδω παιρνεις τον ταδε engineer by id')

        const singleEng = await this.engineerService.findSingleEngineer(engineerId)
        if (singleEng) {
            console.log('Οριστε o ταδε engineer')
            return res.status(200).json(singleEng)
        } else return res.status(404).json({ message: 'That engineer was not found' })
    }

    @Patch(':engineerId')
    @ApiOperation({ summary: 'Use this endpoint to update an engineer based on the body' })
    @ApiParam({
        name: 'engineerId', 
        schema: { type: 'string', format: 'UUID', example: '92a04c73-05b2-4cd5-9513-66e623c6a41a', description: 'Parameter for the api. The ID of the engineer' }
    })
    @ApiBody({
        description: 'Fill the body requirements as shown below',
        schema: { type: 'object', properties: {
            engineer_name: { type: 'string', example: 'Joe', description: 'The name of the engineer' },
            engineer_email: { type: 'string', example: 'joe@j.com', description: 'The email of the engineer' },
        }} })
    @ApiResponse({ status: 200, description: 'An engineer is updated successfully and gets stored in the database' })
    @ApiResponse({ status: 400, description: 'Bad request. Could not update that engineer'})
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'That engineer was not found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async updateEngineer(@Param('engineerId') engineerId: string, @Body() updateEngineerDto: UpdateEngineerDto, @Req()req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub

        updateEngineerDto.engineerId = engineerId

        console.log('Ενημερωνεις ενα engineer')
        const engineerUpdated = await this.engineerService.updateAnEngineerStats(updateEngineerDto, userId)

        if (engineerUpdated) {
            console.log('Updated engineer:', engineerUpdated)
            console.log('engineer was updated')
            return res.status(200).json(engineerUpdated)
        }  else return res.status(400).json({ message: 'The engineer was not updated, check the body' })
    }

    @Delete(':engineerId')
    @ApiOperation({ summary: 'Use this endpoint to delete a single engineer' })
    @ApiParam({ name: 'engineerId', schema: 
        { type: 'string', format: 'uuid', example: '92a04c73-05b2-4cd5-9513-66e623c6a41a', description: 'Unique identifier for the resource' }, 
        required: true })
    @ApiResponse({ status: 200, description: 'engineer deleted successfully' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'That engineer was not found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async deleteEngineer(@Param('engineerId') engineerId: string, @Req()req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub
        console.log('Εδω διαγραφεις ενα engineer')

        await this.engineerService.deleteEngineer(engineerId, userId)

        console.log('Διεγραψες ενα engineer')
        res.status(200).json({ message: 'That engineer got deleted from the database.'})
    }
}
