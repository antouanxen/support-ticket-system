import { Body, Controller, Get, Param, Patch, Post, Req, Res } from '@nestjs/common';
import { AuthenticateService } from './providers/authenticate.service';
import { SignInDto } from './dtos/signIn.dto';
import { SignUpDto } from './dtos/signUp.dto';
import { Request, Response } from 'express';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsPublic } from './decorators/is-public.decorator';
import prisma from 'prisma/prisma_Client';
import { AuthRoles } from './enums/roles.enum';

@Controller('auth')
@ApiTags('Authentication')
export class AuthenticationController {
    constructor( 
        private readonly authenticateService: AuthenticateService
    ) {}

    @Post('sign_up')
    @IsPublic(true)
    @ApiOperation({ summary: 'Use this endpoint to sign up and create a user for the app, and also send an email to the newly created email of user, based on the body' })
    @ApiBody({
        description: 'Fill the body requirements as shown below',
        schema: { type: 'object', properties: {
            username: { type: 'string', example: 'McJackson', description: 'The name of the user, who gets to work with the app' },
            email: { type: 'string', example: 'jack@mcjim.com', description: 'The email of the user' },
            password: { type: 'string', example: 'Password123#', description: 'The password of the user, hashed by bcrypt' },
            role: { type: 'string', enum: ['engineer', null], default: null , description: 'The role of the user, can be either "engineer" or null(for an ordinary agent). This field leads to each user taking different roles and getting stored separately in the database.' },
            category: { type: ' string', example: 'billing', description: 'The category for the user(that is made an "engineer". '},
            agentOwnEmail: { type: 'string', example: 'a@b.com', description: 'The personal email of the user(to be Agent), is completely optional' },
            engineerOwnEmail: { type: 'string', example: 'c@d.com', description: 'The personal email of the user(to be Engineer), is completely optional' },
        }, required: ['email', 'password'] }})
    @ApiResponse({ status: 201, description: 'A user is created successfully and gets stored in the database' })
    @ApiResponse({ status: 400, description: 'Bad request. Could not create that user'})
    @ApiResponse({ status: 409, description: 'Conflict. That user already exists with that email'})
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async signUp(@Body() singUpDto: SignUpDto, @Req() req: Request, @Res() res: Response) {
        console.log('Φτιαχνεις ενα χρηστη')
        const newUser = await this.authenticateService.signUp(singUpDto)
        console.log('New user:', newUser)

        if (newUser) {
            console.log('new user was created')
            return res.status(201).json({ message: 'A new user was created, need to sign in first to get access to the app.', newUser})
        } else return res.status(400).json({ message: 'The user was not created, check the body' })
    }

    @Post('sign_in')
    @IsPublic(true)
    @ApiOperation({ 
        summary: 'Use this endpoint to sign-in a user for the app, based on the body. Sends back a generated an access token, a message and a userId as well and a refresh token which gets stored in cookies.' })
    @ApiBody({
        description: 'Fill the body requirements as shown below',
        schema: { type: 'object', properties: {
            email: { type: 'string', example: 'admin@admin.com', description: 'The email of the user' },
            password: { type: 'string', example: 'Password123!', description: 'The password of the user, hashed by bcrypt' },
        }, required: ['email', 'password'] }})
    @ApiResponse({ status: 200, description: 'A user has logged in successfully and gets a token returned based of on his credentials' })
    @ApiResponse({ status: 400, description: 'Bad request. Could not log in that user'})
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    //@HttpCode(HttpStatus.OK)
    public async signIn(@Body() signInDto: SignInDto, @Req() req: Request, @Res() res: Response) {
        console.log('Συνδεεις ενα χρηστη')
        const result = await this.authenticateService.signIn(signInDto)

        if (result) {
            const user = await prisma.user.findUnique({ 
                where: { userEmail: signInDto.email},
                include: { role: true }
            })
            const userId = user.userId
            const userRole = user.role ? user.role.role_description : 'agent'

            const { accessToken, refreshToken } = result
            res.cookie('refresh-token', refreshToken, { httpOnly: true, sameSite: 'strict', maxAge: 1000 * 60 * 60 * 24 })
            res.setHeader('Authorization', `Bearer ${accessToken}`)

            res.status(200).json({ message: 'The user got logged in', accessToken,  userId, userRole }) 
        } else return res.status(401).json({ message: 'Password is not right. Put the correct password.' })
    } 

    @Post('sign_off')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Use this endpoint to sign off a user Agent from the app' })
    @ApiResponse({ status: 200, description: 'A user agent logs out and has his token version incremented by 1.' })
    @ApiResponse({ status: 400, description: 'Bad request. Could not log out that user agent'})
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async signOff(@Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub

        console.log('Αποσυνδεεις ενα χρηστη')
        const result = await this.authenticateService.signOff(userId)

        if (result) return res.status(200).json({ message: 'User signed off, token version updated.' })
        else return res.status(401).json({ message: 'User needs to sign in first.' })
    }

    @Get('all_users')
    @ApiBearerAuth()
    //@Roles([AuthRoles.ADMIN])
    @ApiOperation({ summary: 'Use this endpoint to fetch all users from the database || ** Roles: Admin **' })
    @ApiResponse({ status: 200, description: 'All the users were fetched successfully' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'No users were found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })  
    public async getAllAgentsRoles(@Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub
        console.log('Εδω παιρνεις ολους τους users της εφαρμογης')

        const agentWithRolesList = await this.authenticateService.getAllUsers(userId)

        if (agentWithRolesList && agentWithRolesList.length > 0) {
            console.log('Οι agents με roles φτασανε')
            console.log('Tο συνολο τους:', agentWithRolesList.length)

            return res.status(200).json(agentWithRolesList)
        } else return res.status(404).json({ message: 'No users were found' })
    }

    @Patch('user_role_update/:userIdTobeUpdated')
    @ApiBearerAuth()
    //@Roles([AuthRoles.ADMIN, AuthRoles.MODERATOR])
    @ApiOperation({ summary: 'Use this endpoint to update a user role, based on the body || ** Roles: Admin, Moderator **' })
    @ApiParam({
        name: 'userIdTobeUpdated', 
        schema: { type: 'string', example: '36fa11f2-3ac4-4e4b-9e76-c4db8d1ceec6', description: 'Parameter for the api. The ID of the USER' }
    })
    @ApiBody({
        description: 'Fill the body requirements as shown below',
        schema: { type: 'object', properties: {
            role: { type: 'string', example: 'supervisor', description: 'An enum for the status of the ticket issued, use the example options as shown'},
           }, 
            required: ['status'] }, })
    @ApiResponse({ status: 200, description: 'The user got his role updated successfully and gets stored in the database' })
    @ApiResponse({ status: 400, description: 'Bad request. Could not update that user-role'})
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'That role or user was not found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async updateRoleForUser(@Param('userIdTobeUpdated') userIdTobeUpdated: string, @Body('role') role: AuthRoles, @Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub

        console.log('Ενημερωνεις το role για τον user')
        const userRoleToBeUpdated = await this.authenticateService.updateUserRole(userId, userIdTobeUpdated, role)

        if (userRoleToBeUpdated) {
            console.log('Νεος ρολος για τον user', userRoleToBeUpdated)
            console.log('User role got updated')
            return res.status(200).json({ message: `User ${userRoleToBeUpdated.userName} got a new role ${userRoleToBeUpdated.role.role_description}.`, userRoleToBeUpdated})
        } else return res.status(400).json('There was an error with the request body. Try again')
    }
}
