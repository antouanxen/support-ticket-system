import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { role } from '@prisma/client';
import prisma from 'prisma/prisma_Client';
import { CreateRoleDto } from 'src/role/dtos/create-role.dto';

@Injectable()
export class RoleService {
    constructor() {}

    public async createNewRole(createRoleDto: CreateRoleDto, userId: string): Promise<role> {
        const agentId = userId
        const { role_description } = createRoleDto
        
        if (!agentId) throw new NotFoundException('User does not exist')

        try {
            const newRole = await prisma.role.create({
                data: { role_description: role_description }
            })
    
            return newRole
        } catch (err) {
            console.log('error creating a new role', err)
            throw new InternalServerErrorException('There was an error creating a new role')
        } 
    }

    public async findRoleByDesc(role_description: string): Promise<role> {
        try {
            const findSingleRole = await prisma.role.findUnique({ where: { role_description: role_description } })

            if (!findSingleRole) throw new NotFoundException('That role does not exist. Try again')

            return findSingleRole
        } catch (err) {
            console.log('There was an error finding the exact role', err)
            throw new InternalServerErrorException('There was an error finding that role')
        }
    }

    public async findRoleById(role_id: string): Promise<role> {
        try {
            const findSingleRole = await prisma.role.findUnique({ where: { role_id: role_id } })

            if (!findSingleRole) throw new NotFoundException('That role does not exist. Try again')

            return findSingleRole
        } catch (err) {
            console.log('There was an error finding the exact role', err)
            throw new NotFoundException('There was an error finding that role')
        }
    }

    public async findAllRoles(userId: string): Promise<role[]> {
        const agentId = userId

        if (!agentId) throw new NotFoundException('User does not exist')

        try {
            const allRoles = await prisma.role.findMany({
                orderBy: { role_description: 'desc' },
                include: { agent: true }
            })

            return allRoles
        } catch (err) {
            console.log('No roles were returned', err)
            throw new InternalServerErrorException('There was an error with the server finding the roles. Try again')
        } 
    }

    public async deleteRole(role_id: string, userId: string) {
        const agentId = userId

        if (!agentId) throw new NotFoundException('User does not exist')

        try {
            const roleToBeDeleted = await this.findRoleById(role_id)

            if (!roleToBeDeleted) throw new NotFoundException('Role not found');

            await prisma.role.delete({ where: { role_id: roleToBeDeleted.role_id } })

            return;
        } catch(err) {
            if (err instanceof NotFoundException) {
                console.log('Role not found', err.message)
                throw err
            }
            console.log('Error deleting the role', err)
            throw new InternalServerErrorException(`There was an error with the server delete the role. Try again`)
        }  
    }
}
