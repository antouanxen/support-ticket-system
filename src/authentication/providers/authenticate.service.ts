import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { HashingService } from './hashing.service';
import { SignUpDto } from '../dtos/signUp.dto';
import prisma from 'prisma/prisma_Client';
import { SignInDto } from '../dtos/signIn.dto';
import { GenerateTokensService } from './generate-tokens.service';
import { WelcomeEmailData } from 'src/mailer/interfaces/WelcomeEmailData.interface';
import { MailService } from 'src/mailer/provider/mail.service';
import { RoleService } from 'src/role/provider/role.service';
import { AuthRoles } from '../enums/roles.enum';
import { CategoryService } from 'src/category/provider/category.service';

@Injectable()
export class AuthenticateService {
    constructor(
        private readonly hashingService: HashingService,
        private readonly generateTokensService: GenerateTokensService,
        private readonly mailService: MailService,
        private readonly roleService: RoleService,
        private readonly categoryService: CategoryService,
    ) {}

    public async signUp(signUpDto: SignUpDto) {
        const { username, email, password, role, agentOwnEmail, engineerOwnEmail } = signUpDto
        
        try {
            const user = await prisma.user.findUnique({
                where: { userEmail: email }
            })
    
            if (user) throw new ConflictException('This user already exists. Sign up with a new user')

            if (role === AuthRoles.ENGINEER) {
                const roleForUser = await this.roleService.findRoleByDesc(role)
                const category = await this.categoryService.getSingleCategoryByName(signUpDto.category)

                const newUser = await prisma.user.create({
                    data: {
                        userName: username || signUpDto.email?.split('@')[0] || 'new user',
                        userEmail: email,
                        userPassword: await this.hashingService.hashPassword(password),
                        roleId: roleForUser ? roleForUser.role_id : null
                    },
                    include: { role: true }
                })

                if (roleForUser && roleForUser.role_description === "engineer") {
                    await prisma.engineer.create({
                        data: {
                            userId: newUser.id,
                            engineerOwnEmail: engineerOwnEmail,
                            categoryId: category.id
                        }
                    })
                }

                const welcomeEmailData: WelcomeEmailData = {
                    userId: newUser.id,
                    userEmail: newUser.userEmail,
                    userName: newUser.userName
                }
                await this.mailService.sendEmailWelcome(welcomeEmailData)
                console.log('πηγε το εμαιλ για το καλοσωρισμα')
    
                return new SignUpDto({
                    username: newUser.userName,
                    email: newUser.userEmail,
                    role: newUser.role.role_description,
                    category: signUpDto.category
                })
            } else {
                const newUser = await prisma.user.create({
                    data: {
                        userName: username || signUpDto.email?.split('@')[0] || 'new user',
                        userEmail: email,
                        userPassword: await this.hashingService.hashPassword(password)
                    },
                    include: { role: true }
                })

                await prisma.agent.create({
                    data: {
                        userId: newUser.id,
                        agentOwnEmail: agentOwnEmail
                    }
                })

                const welcomeEmailData: WelcomeEmailData = {
                    userId: newUser.id,
                    userEmail: newUser.userEmail,
                    userName: newUser.userName
                }
                await this.mailService.sendEmailWelcome(welcomeEmailData)
                console.log('πηγε το εμαιλ για το καλοσωρισμα')
    
                return new SignUpDto({
                    username: newUser.userName,
                    email: newUser.userEmail,
                    role: newUser.roleId ? newUser.role.role_description : 'agent'
                })
            }
        } catch(err) {
            if (err instanceof ConflictException) {
                throw err
            }
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
                console.log(`Ο χρηστης με ID: ${userExists.id} συνδεθηκε στην εφαρμογη`)  

                await prisma.user.update({
                    where: { id: userExists.id },
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
            const user = await prisma.user.findUnique({ where: { id: userId } })

            if (!user) throw new BadRequestException('This user does not exist')

            if (user.tokenVersion >= 8193) {
                await prisma.user.update({
                    where: { id: userId },
                    data: { tokenVersion: 1 }
                })
            } else {
                await prisma.user.update({
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
