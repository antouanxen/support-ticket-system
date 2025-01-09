import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { HashingService } from './hashing.service';
import { SignUpDto } from '../dtos/signUp.dto';
import prisma from 'prisma/prisma_Client';
import { SignInDto } from '../dtos/signIn.dto';
import { GenerateTokensService } from './generate-tokens.service';
import { WelcomeEmailData } from 'src/mailer/interfaces/WelcomeEmailData.interface';
import { MailService } from 'src/mailer/provider/mail.service';
import { RoleService } from 'src/role/provider/role.service';

@Injectable()
export class AuthenticateService {
    constructor(
        private readonly hashingService: HashingService,
        private readonly generateTokensService: GenerateTokensService,
        private readonly mailService: MailService,
        private readonly roleService: RoleService,
    ) {}

    public async signUp(signUpDto: SignUpDto) {
        const { username, email, password, userOwnEmail } = signUpDto
        
        try {
            const user = await prisma.user.findUnique({
                where: { userEmail: email }
            })
    
            if (user) throw new ConflictException('This user already exists. Sign up with a new user')

            const newUser = await prisma.user.create({
                data: {
                    userName: username || signUpDto.email?.split('@')[0] || 'new user',
                    userEmail: email,
                    userPassword: await this.hashingService.hashPassword(password)
                }
            })

            const welcomeEmailData: WelcomeEmailData = {
                userId: newUser.userId,
                userEmail: newUser.userEmail,
                userName: newUser.userName
            }
            await this.mailService.sendEmailWelcome(welcomeEmailData)
            console.log('πηγε το εμαιλ για το καλοσωρισμα')

            return new SignUpDto({
                username: newUser.userName,
                email: newUser.userEmail
            })
        } catch(err) {
            if (err instanceof ConflictException) throw err
            
            console.log('There was an error with the sign up', err)
            throw new InternalServerErrorException('There was an error creating the user. Try again')
        }
    }

    public async signIn(singInDto: SignInDto) {
        const { email, password } = singInDto
        
        let rightPassword: boolean = false

        try {
            const userExists = await prisma.user.findUnique({
                where: { userEmail: email }
            })   

            if (!userExists) throw new NotFoundException('User does not exist')

            rightPassword = await this.hashingService.comparePassword(password, userExists.userPassword)

            if (rightPassword) {
                console.log(`Ο χρηστης με ID: ${userExists.userId} συνδεθηκε στην εφαρμογη`)  

                await prisma.user.update({
                    where: { userId: userExists.userId },
                    data: { last_logged_at: new Date() }
                })

                return await this.generateTokensService.generateTokens(userExists)
            } 
            else throw new UnauthorizedException('Password is not right. Put the correct password.')
        } catch(err) {
            console.log('There was an error with the sign in', err)
            throw new InternalServerErrorException('There was an error logging the user. Try again')
        }
    } 

    public async signOff(userId: string) {
        try {
            const user = await prisma.user.findUnique({ where: { userId: userId } })

            if (!user) throw new BadRequestException('This user does not exist')

            if (user.tokenVersion >= 8193) {
                await prisma.user.update({
                    where: { userId: userId },
                    data: { tokenVersion: 1 }
                })
            } else {
                await prisma.user.update({
                    where: { userId: userId },
                    data: { tokenVersion: { increment: 1 } }
                })
            }
            console.log(`Ο χρηστης με ID: ${user.userId}, αποσυνδεθηκε`)
            return { message: 'User signed off, token version updated.' }
        } catch(err) {
            console.log('There was an error during sign off', err)
            throw new InternalServerErrorException('There was an error signing off the user. Try again')
        }
    }

    public async getAllUsers(userId: string) {
        try {
            const user = await prisma.user.findUnique({
                where: { userId: userId }
            })

            if (!user) throw new NotFoundException('This user does not exist')

            const userList = await prisma.user.findMany({
                where: { userId: { not: userId } },
                select: { 
                    userId: true,
                    userName: true,
                    userEmail: true,
                    last_logged_at: true,
                    role: { select: { role_description: true } },
                    category: { select: { categoryName: true } },
                    assigned_engineers: { select: { ticketCustomId: true } },
                    supervisors_users_supervisor: { select: { user: true } },
                    supervisors_users_user: { select: { supervisor: true } },
                    ticket: { select: { customTicketId: true } }
                }
            })

            if (userList.length > 0) return userList
            else return []
        } catch (err: any) {
            if (err instanceof NotFoundException) throw err

            console.log('There was an error finding all the users from the database', err)
            throw new InternalServerErrorException('There was an error finding all the users from the database. Try again.')
        }
    }

    public async updateUserRole(userId: string, userIdTobeUpdated: string, role: string) {
        try {
            const user = await prisma.user.findUnique({ 
                where: { userId: userId }
            })
    
            if (!user) throw new NotFoundException('This user does not exist')
    
            const userToBeUpdated = await prisma.user.findUnique({
                where: { userId: userIdTobeUpdated },
                include: { role: true }
            })    

            if (!userToBeUpdated) throw new NotFoundException('This user does not exist')

            const roleForUser = await this.roleService.findRoleByDesc(role)

            const updatedUserRole = await prisma.user.update({
                where: { userId: userToBeUpdated.userId }, 
                data: {
                    roleId: roleForUser.role_id ?? (userToBeUpdated.role.role_id || null)
                },
                select: {
                    userId: true,
                    userName: true,
                    role: { select: { role_id: true, role_description: true } }
                }
            })

            return updatedUserRole
        } catch (err: any) {
            if (err instanceof NotFoundException) throw err
            if (err instanceof BadRequestException) throw err

            console.log('There was an error updating the user role', err)
            throw new InternalServerErrorException('There was an error updating the user role. Try again')
        }
    }
}
