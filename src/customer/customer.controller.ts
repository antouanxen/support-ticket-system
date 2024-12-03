import { Body, Controller, Get, Param, Patch, Post, Req, Res } from '@nestjs/common';
import { CustomerService } from './provider/customer.service';
import { CreateCustomerDto } from './dtos/create-customer.dto';
import { Request, Response } from 'express';
import { UpdateCustomerDto } from './dtos/update-customer.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller('customers')
@ApiTags('Customers')
@ApiBearerAuth()
export class CustomerController {
    constructor(private readonly customerService: CustomerService) {}

    @Post()
    @ApiOperation({ summary: 'Use this endpoint to create a customer based on the body' })
    @ApiBody({
        description: 'Fill the body requirements as shown below',
        schema: { type: 'object', properties: {
            c_name: { type: 'string', example: 'McJordan Jack', description: 'The name of the customer, whom the ticket is issued for' },
            company: { type: 'string', example: 'MON IKE', description: 'The name of the company of the customer, whom the ticket is issued for' },
            c_email: { type: 'string', example: 'jack@mcjordan.com', description: 'The email of the customer, whom the ticket is issued for' },
            c_telNumber: { type: 'string', example: '+302101234567', description: 'The telephone number of the customer, whom the ticket is issued for' },
        }, required: ['c_name', 'c_email'] }, })
    @ApiResponse({ status: 201, description: 'A customer is created successfully and gets stored in the database' })
    @ApiResponse({ status: 400, description: 'Bad request. Could not create that customer'})
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 409, description: 'Conflict. That customer already exists with that email' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async createCustomer(@Body() createCustomerDto: CreateCustomerDto, @Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub

        console.log('Φτιαχνεις εναν customer')
        const customerCreated = await this.customerService.createCustomer(createCustomerDto, userId)
        console.log('New customer:', customerCreated)
        
        if (customerCreated) {
            console.log('Customer was created')
            return res.status(201).json(customerCreated)
        }
        else return res.status(400).json({ message: 'The customer was not created, check the body' })
    }

    @Get()
    @ApiOperation({ summary: 'Use this endpoint to fetch all customers from the database ' })
    @ApiResponse({ status: 200, description: 'All the customers were fetched successfully' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'No customers were found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' }) 
    public async getAllCustomers(@Req() req: Request, @Res() res: Response) {
        console.log('Εδω παιρνεις ολους τους customers')
        const user = req.res.locals.user
        const userId = user.sub

        const customerList = await this.customerService.getAllCustomers(userId)

        if (customerList && customerList.length > 0) {
            console.log('Οι customers φτασανε')
            console.log('Tο συνολο τους:', customerList.length)

            return res.status(200).json(customerList)
        } else return res.status(404).json({ message: 'No customers were found' })
    }

    @Get(':customerName')
    @ApiOperation({ summary: 'Use this endpoint to fetch a customer by its NAME from the database' })
    @ApiParam({
        name: 'customerName', 
        schema: { type: 'string', example: 'Alice', description: 'Parameter for the api. The NAME of the customer' }
    })
    @ApiResponse({ status: 200, description: 'A customer is fetched successfully' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'That customer was not found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })  
    public async getSingleCustomer(@Param('customerName') customerName: string,  @Req() req: Request, @Res() res: Response) {
        console.log('Eδω παιρνεις τον ταδε customer')
        const user = req.res.locals.user
        const userId = user.sub

        const singleCustomer = await this.customerService.getSingleCustomerByName(customerName)
        if (singleCustomer) {
            console.log(singleCustomer)
            console.log('Οριστε o customer')
            return res.status(200).json(singleCustomer)
        }
        else {
            console.log(`Δεν υπαρχει αυτος ο customer με ID: ${singleCustomer.id}`)
            return res.status(404).json({ message: 'That customer was not found'})
        } 
    }

    @Get(':customerId')
    @ApiOperation({ summary: 'Use this endpoint to fetch a single customer by its ID from the database' })
    @ApiParam({
        name: 'customerId', 
        schema: { type: 'string', format: 'UUID', example: '895fd3e6-be7e-4d99-9dba-892d23117722', description: 'Parameter for the api. The ID of the customer you wish to find' }
    })
    @ApiResponse({ status: 200, description: 'A single customer was fetched successfully' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'That customer was not found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })  
    public async getSinglecustomerById(@Param('customerId') customerId: string, @Req() req: Request, @Res() res: Response) {
        console.log('Εδω παιρνεις το ταδε customer by ID')

        const singleCustomer = await this.customerService.getSingleCustomerById(customerId)
        if (singleCustomer) {
            console.log('Οριστε ο ταδε customer')
            return res.status(200).json(singleCustomer)
        } else return res.status(404).json({ message: 'That customer was not found' })
    }

    @Patch(':customerId')
    @ApiOperation({ summary: 'Use this endpoint to update a customer based on the body' })
    @ApiParam({
        name: 'customerId', 
        schema: { type: 'string', format: 'UUID', example: 'dd482ec1-d8ba-4feb-a985-a2f32320101e', description: 'Parameter for the api. The name of the customer' }
    })
    @ApiBody({
        description: 'Fill the body requirements as shown below',
        schema: { type: 'object', properties: {
            c_name: { type: 'string', example: 'McJohn Jack', description: 'The name of the customer, whom the ticket is issued for' },
            company: { type: 'string', example: 'MONe IKE', description: 'The name of the company of the customer, whom the ticket is issued for' },
            c_email: { type: 'string', example: 'jack@mcjohn.com', description: 'The email of the customer, whom the ticket is issued for' },
            c_telNumber: { type: 'string', example: '+302101234568', description: 'The telephone number of the customer, whom the ticket is issued for' },
        }},  
    })
    @ApiResponse({ status: 200, description: 'A Customer is updated successfully and gets stored in the database' })
    @ApiResponse({ status: 400, description: 'Bad request. Could not update that customer'})
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'That customer was not found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async updateCustomer(@Param('customerId') customerId: string, @Body() updateCustomerDto: UpdateCustomerDto, @Req()req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub

        updateCustomerDto.customerId = customerId

        console.log('Ενημερωνεις εναν customer')
        const customerUpdated = await this.customerService.updateCustomer(updateCustomerDto, userId)

        if (customerUpdated) {
            console.log('Updated a customer:', customerUpdated)
            console.log('Customer was updated')
            return res.status(200).json(customerUpdated)
        }  else return res.status(400).json({ message: 'The customer was not updated, check the body' })
    }
}
