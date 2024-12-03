import { ConflictException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { HashingService } from './hashing.service';
import { SignUpDto } from '../dtos/signUp.dto';
import prisma from 'prisma/prisma_Client';
import { SignInDto } from '../dtos/signIn.dto';
import { GenerateTokensService } from './generate-tokens.service';
import { WelcomeEmailData } from 'src/mailer/interfaces/WelcomeEmailData.interface';
import { MailService } from 'src/mailer/provider/mail.service';

@Injectable()
export class AuthenticateService {
    constructor(
        private readonly hashingService: HashingService,
        private readonly generateTokensService: GenerateTokensService,
        private readonly mailService: MailService,
    ) {}

    public async signUp(signUpDto: SignUpDto) {
        const { username, email, password } = signUpDto
        
        try {
            const userAgent = await prisma.agent.findUnique({
                where: { agentEmail: email }
            })
    
            if (userAgent) throw new ConflictException('This user already exists. Sign up with a new user')
    
            const newUserAgent = await prisma.agent.create({
                data: {
                    agentName: username || signUpDto.email?.split('@')[0] || 'new user',
                    agentEmail: email,
                    agentPassword: await this.hashingService.hashPassword(signUpDto.password)
                }
            })

            const welcomeEmailData: WelcomeEmailData = {
                agentId: newUserAgent.id,
                agentEmail: newUserAgent.agentEmail,
                agentName: newUserAgent.agentName
            }
            await this.mailService.sendEmailWelcome(welcomeEmailData)
            console.log('πηγε το εμαιλ για το καλοσωρισμα')

            return new SignUpDto({
                username: newUserAgent.agentName,
                email: newUserAgent.agentEmail
            })
        } catch(err) {
            console.log('There was an error with the sign up', err)
            throw new InternalServerErrorException('There was an error creating the user. Try again')
        }
    }

    public async signIn(singInDto: SignInDto) {
        const { email, password } = singInDto
        
        let rightPassword: boolean = false

        try {
            const userAgent = await prisma.agent.findUnique({
                where: { agentEmail: email }
            })   

            if (!userAgent) throw new NotFoundException('User does not exist')

            rightPassword = await this.hashingService.comparePassword(password, userAgent.agentPassword)

            if (rightPassword) {
                console.log(`Ο χρηστης με ID: ${userAgent.id} συνδεθηκε στην εφαρμογη`)  

                await prisma.agent.update({
                    where: { id: userAgent.id },
                    data: { last_logged_at: new Date() }
                })

                return await this.generateTokensService.generateTokens(userAgent)
            } 
            else throw new UnauthorizedException('Password is not right. Put the correct password.')
        } catch(err) {
            console.log('There was an error with the sign in', err)
            throw new InternalServerErrorException('There was an error logging the user. Try again')
        }
    } 

    public async signOff(userId: string) {
        try {
            const user = await prisma.agent.findUnique({ where: { id: userId } })

            if (user.tokenVersion >= 8193) {
                await prisma.agent.update({
                    where: { id: userId },
                    data: { tokenVersion: 1 }
                })
            } else {
                await prisma.agent.update({
                    where: { id: userId },
                    data: { tokenVersion: { increment: 1 } }
                })
            }
            console.log(`Ο χρηστης με ID: ${user.id}, αποσυνδεθηκε`)
            return { message: 'User signed off, token version updated.' }
        } catch(err) {
            console.log('There was an error during sign off', err)
            throw new InternalServerErrorException('There was an error signing off the user. Try again')
        }
    }
}
