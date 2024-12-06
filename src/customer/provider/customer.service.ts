import { ConflictException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateCustomerDto } from '../dtos/create-customer.dto';
import { customer } from '@prisma/client';
import prisma from 'prisma/prisma_Client';
import { USER_ID } from 'src/authentication/constants/constantForUserAgent';
import { UpdateCustomerDto } from '../dtos/update-customer.dto';
import { GetSingleCustomerDto } from '../dtos/get-single_customer';

@Injectable()
export class CustomerService {
    constructor() {}

    public async createCustomer(createCustomerDto: CreateCustomerDto, userId: string): Promise<customer | { message: string }> {
        const agentId = userId

        if (!agentId) throw new NotFoundException('User does not exist')
        
        try {
            const existingCustomer = await prisma.customer.findUnique({
                where: { c_name: createCustomerDto.c_name, c_email: createCustomerDto.c_email}
            })

            if (existingCustomer) throw new ConflictException('That name or email of the customer already exists');
            
            const newCustomer = await prisma.customer.create({
                data: { 
                    c_name: createCustomerDto.c_name,
                    company: createCustomerDto.company,
                    c_email: createCustomerDto.c_email,
                    c_telNumber: createCustomerDto.c_telNumber
                }
            })
            return newCustomer
        } catch(err) {
            console.log('Customer was not created', err)
            throw new InternalServerErrorException('There was an error with the server. Try again')
        }
    }

    public async getAllCustomers(userId: string): Promise<customer[]> {
        const agentId = userId

        if (!agentId) throw new NotFoundException('User does not exist')
        
        try {
            const customerList = await prisma.customer.findMany({
                include: { ticket: true }
            })

            if (customerList && customerList.length > 0) {
                return customerList
            } else return []
        } catch(err) {
            console.log('No customers were returned', err)
            throw new InternalServerErrorException('There was an error with the server. Try again')
        }
    }

    public async getSingleCustomerByName(name: string): Promise<Partial<customer>> {
        try {
            const singleCustomer = await prisma.customer.findFirst({
                where: { c_name: name },
               select: { 
                    ticket: true,
                    id: true,
                    c_name: true,
                    c_email: true, 
                    c_telNumber: true,
                    company: true,
                    created_at: true 
                }
            })

            if (!singleCustomer) throw new NotFoundException('That customer was not found')

            return singleCustomer
        } catch(err: any) {
            console.log('Could not find the customer', err)
            throw new InternalServerErrorException('There was an error with the server. Try again')
        }
    }

    public async getSingleCustomerById(customer_id: string): Promise<customer> {
        try {
            const getSingleCustomer = await prisma.customer.findUnique({ where: { id: customer_id } })

            if (!getSingleCustomer) throw new NotFoundException('That customer does not exist. Try again')

            return getSingleCustomer
        } catch (err) {
            console.log('There was an error finding the exact customer', err)
            throw new NotFoundException('There was an error finding that customer')
        }
    }

    public async updateCustomer(updateCustomerDto: UpdateCustomerDto, userId: string): Promise<Partial<customer>> {
        const agentId = userId

        if (!agentId) throw new NotFoundException('User does not exist')

        try {
            const customerToBeUpdated = await prisma.customer.findUnique({
                where: { id: updateCustomerDto.customerId },     
            })

            if (!customerToBeUpdated) throw new NotFoundException('Customer not found');

            const updatedCustomer = await prisma.customer.update({
                where: { id: updateCustomerDto.customerId },
                data: {
                    c_name: updateCustomerDto.c_name ?? customerToBeUpdated.c_name,
                    company: updateCustomerDto.company ?? customerToBeUpdated.company,
                    c_email: updateCustomerDto.c_email ?? customerToBeUpdated.c_email,
                    c_telNumber: updateCustomerDto.c_telNumber ?? customerToBeUpdated.c_telNumber,
                    updated_at: new Date()
                } 
            })

            return updatedCustomer
        } catch(err) {
            console.log('Could not update that customer', err)
            throw new InternalServerErrorException('There was an error with the server. Try again')
        }
    }
}
