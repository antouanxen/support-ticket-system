import { Body, Controller, Delete, Get, Param, Post, Req, Res } from '@nestjs/common';
import { RoleService } from './provider/role.service';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateRoleDto } from 'src/role/dtos/create-role.dto';
import { Request, Response } from 'express';
import { Roles } from 'src/authentication/decorators/roles.decorator';
import { AuthRoles } from 'src/authentication/enums/roles.enum';
import { IsPublic } from 'src/authentication/decorators/is-public.decorator';

@Controller('roles')
@ApiTags('Roles')
@ApiBearerAuth()
export class RoleController {
    constructor(
        private readonly roleService: RoleService
    ) {}

    @Post()
    //@Roles([AuthRoles.ADMIN, AuthRoles.MODERATOR])
    @ApiOperation({ summary: 'Use this endpoint to create a role based on the body || ** Roles: Admin, Moderator **' })
    @ApiBody({
        description: 'Fill the body requirements as shown below',
        schema: { type: 'object', properties: {
            role_description: { type: 'string', example: 'neroulas', description: 'A text area for the description of the role, for the agent.'},
        }, required: ['role_description'] }, })
    @ApiResponse({ status: 201, description: 'A new role is created successfully and is stored in the database' })
    @ApiResponse({ status: 400, description: 'Bad request. Could not create that role'})
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async createNewRole(@Body() createRoleDto: CreateRoleDto, @Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub

        console.log('Φτιαχνεις ενα νεο role')
        const roleTobeCreated = await this.roleService.createNewRole(createRoleDto, userId)
        console.log('New role:', roleTobeCreated)

        if (roleTobeCreated) {
            console.log('A new role has been created')
            res.status(201).json(roleTobeCreated)
        }
        else return res.status(400).json({ message: 'The role was not created, check the body' })
    }

    @Get()
    @ApiOperation({ summary: 'Use this endpoint to fetch all roles from the database ' })
    @ApiResponse({ status: 200, description: 'All the roles were fetched successfully' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'No roles were found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })  
    public async getAllRoles(@Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub
        console.log('Εδω παιρνεις ολα τα roles')

        const roleList = await this.roleService.findAllRoles(userId)

        if (roleList && roleList.length > 0) {
            console.log('Τα roles φτασανε')
            console.log('Tο συνολο τους:', roleList.length)

            return res.status(200).json(roleList)
        } else return res.status(404).json({ message: 'No categories were found' })
    }

    @Get(':roleName')
    @ApiOperation({ summary: 'Use this endpoint to fetch a role by its name from the database' })
    @ApiParam({
        name: 'roleName', 
        schema: { type: 'string', example: 'moderator', description: 'Parameter for the api. The name of the role' } })
    @ApiResponse({ status: 200, description: 'A role is fetched successfully' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'That role was not found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })  
    public async getSingleRoleByName(@Param('roleName') roleName: string, @Req() req: Request, @Res() res: Response) {
        console.log('Eδω παιρνεις το ταδε role by name')

        const singleRole= await this.roleService.findRoleByDesc(roleName)
        if (singleRole) {
            console.log('Οριστε το role', singleRole)
            return res.status(200).json(singleRole)
        } else {
            console.log(`Δεν υπαρχει αυτο το role με ID: ${singleRole.role_id}`)
            return res.status(404).json({ message: 'That role was not found'})
        } 
    }

    @Get(':roleId')
    @ApiOperation({ summary: 'Use this endpoint to fetch a single role by its ID from the database' })
    @ApiParam({
        name: 'roleId', 
        schema: { type: 'string', format: 'UUID', example: 'ff20fcd0-dec6-4d4c-b06e-d3ae16204cc8', description: 'Parameter for the api. The ID of the role you wish to find' }
    })
    @ApiResponse({ status: 200, description: 'A single role was fetched successfully' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'That role was not found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })  
    public async getSingleRoleById(@Param('roleId') roleId: string, @Req() req: Request, @Res() res: Response) {
        console.log('Εδω παιρνεις το ταδε role by id')

        const singleRole = await this.roleService.findRoleById(roleId)
        if (singleRole) {
            console.log('Οριστε το ταδε role')
            return res.status(200).json(singleRole)
        } else return res.status(404).json({ message: 'That role was not found' })
    }

    @Delete(':roleId')
    //@Roles([AuthRoles.ADMIN, AuthRoles.MODERATOR])
    @ApiOperation({ summary: 'Use this endpoint to delete a single role || ** Roles: Admin, Moderator, Supervisor **' })
    @ApiParam({ name: 'roleId', schema: 
        { type: 'string', format: 'uuid', example: '4db445cc-89d3-4c9e-9d3a-c4c610805d25', description: 'Unique identifier for the resource' }, 
        required: true })
    @ApiResponse({ status: 200, description: 'role deleted successfully' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'That role was not found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async deleteRole(@Param('roleId') roleId: string, @Req()req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub
        console.log('Εδω διαγραφεις ενα role')

        await this.roleService.deleteRole(roleId, userId)

        console.log('Διεγραψες ενα role')
        res.status(200).json({ message: 'That role got deleted.'})
    }
}
