import { Body, Controller, Param, Post, Req, Res } from '@nestjs/common';
import { AuthenticateService } from './providers/authenticate.service';
import { SignInDto } from './dtos/signIn.dto';
import { SignUpDto } from './dtos/signUp.dto';
import { Request, Response } from 'express';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsPublic } from './decorators/is-public.decorator';
import prisma from 'prisma/prisma_Client';

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
                where: { userEmail: signInDto.email}
            })
            const userId = user.id
            const { accessToken, refreshToken } = result
            res.cookie('refresh-token', refreshToken, { httpOnly: true, sameSite: 'strict', maxAge: 1000 * 60 * 60 * 24 })
            res.setHeader('Authorization', `Bearer ${accessToken}`)

            res.status(200).json({ message: 'The user got logged in', accessToken,  userId}) 
        } else return res.status(401).json({ message: 'Password is not right. Put the correct password.' })
    } 

    @Post('sign_off/:userId')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Use this endpoint to sign off a user Agent from the app' })
    @ApiParam({
        name: 'userId', 
        schema: { type: 'string', example: 'ff4cb519-7a04-4bb3-8610-37fbf49226ec', description: 'Parameter for the api. The ID of the user agent.' } })
    @ApiResponse({ status: 200, description: 'A user agent logs out and has his token version incremented by 1.' })
    @ApiResponse({ status: 400, description: 'Bad request. Could not log out that user agent'})
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async signOff(@Param('userId') userId: string, @Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        userId = user.sub

        console.log('Αποσυνδεεις ενα χρηστη')
        const result = await this.authenticateService.signOff(userId)

        if (result) return res.status(200).json({ message: 'User signed off, token version updated.' })
        else return res.status(401).json({ message: 'User needs to sign in first.' })
    }
}
