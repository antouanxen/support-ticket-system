import { Body, Controller, Delete, Get, Param, Patch, Post, Req, Res } from '@nestjs/common';
import { CategoryService } from './provider/category.service';
import { CreateCategoryDto } from './dtos/create-category.dto';
import { Request, Response } from 'express';
import { UpdateCategoryDto } from './dtos/update-category.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller('categories')
@ApiTags('Categories')
@ApiBearerAuth()
export class CategoryController {
    constructor(private readonly categoryService: CategoryService) {}

    @Post()
    @ApiOperation({ summary: 'Use this endpoint to create a category based on the body' })
    @ApiBody({
        description: 'Fill the body requirements as shown below',
        schema: { type: 'object', properties: {
            categoryName: { type: 'string', example: 'feedback', description: 'The name of the category, used for ticket categorization' },
        }, required: ['categoryName'] } })
    @ApiResponse({ status: 201, description: 'A category is created successfully and gets stored in the database' })
    @ApiResponse({ status: 400, description: 'Bad request. Could not create that category'})
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async createCategory(@Body() createCategoryDto: CreateCategoryDto, @Req() req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub

        console.log('Φτιαχνεις ενα category')
        const categoryCreated = await this.categoryService.createCategory(createCategoryDto, userId)
        console.log('New category:', categoryCreated)
        
        if (categoryCreated) {
            console.log('Category was created')
            return res.status(201).json(categoryCreated)
        }
        else return res.status(400).json({ message: 'The category was not created, check the body' })
    }

    @Get()
    @ApiOperation({ summary: 'Use this endpoint to fetch all categories from the database ' })
    @ApiResponse({ status: 200, description: 'All the categories were fetched successfully' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'No categories were found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })  
    public async getAllCategories(@Req() req: Request, @Res() res: Response) {
        console.log('Εδω παιρνεις ολα τα categories')
        const user = req.res.locals.user
        const userId = user.sub

        const categoryList = await this.categoryService.getAllCategories(userId)

        if (categoryList && categoryList.length > 0) {
            console.log('Τα categories φτασανε')
            console.log('Tο συνολο τους:', categoryList.length)

            return res.status(200).json(categoryList)
        } else return res.status(404).json({ message: 'No categories were found' })
    }

    @Get(':categoryName')
    @ApiOperation({ summary: 'Use this endpoint to fetch a category by its NAME from the database' })
    @ApiParam({
        name: 'categoryName', 
        schema: { type: 'string', example: 'technical_issue', description: 'Parameter for the api. The name of the category' } })
    @ApiResponse({ status: 200, description: 'A category is fetched successfully' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'That category was not found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })  
    public async getSingleCategoryByName(@Param('categoryName') categoryName: string, @Req() req: Request, @Res() res: Response) {
        console.log('Eδω παιρνεις το ταδε category')

        const singleCategory = await this.categoryService.getSingleCategoryByName(categoryName)
        if (singleCategory) {
            console.log('Οριστε το category', singleCategory)
            return res.status(200).json(singleCategory)
        } else {
            console.log(`Δεν υπαρχει αυτο το category με ID: ${singleCategory.id}`)
            return res.status(404).json({ message: 'That category was not found'})
        } 
    }

    @Get(':categoryId')
    @ApiOperation({ summary: 'Use this endpoint to fetch a single category by its ID from the database' })
    @ApiParam({
        name: 'categoryId', 
        schema: { type: 'string', format: 'UUID', example: '34d283c5-4f0b-42b3-bdda-33ee44ac8b13', description: 'Parameter for the api. The ID of the category you wish to find' }
    })
    @ApiResponse({ status: 200, description: 'A single role was fetched successfully' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'That role was not found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })  
    public async getSingleCategoryById(@Param('categoryId') category_id: string, @Req() req: Request, @Res() res: Response) {
        console.log('Εδω παιρνεις τον ταδε category by id')

        const singleCategory = await this.categoryService.findCategoryById(category_id)
        if (singleCategory) {
            console.log('Οριστε το ταδε category')
            return res.status(200).json(singleCategory)
        } else return res.status(404).json({ message: 'That category was not found' })
    }

    @Patch(':categoryId')
    @ApiOperation({ summary: 'Use this endpoint to update a category based on the body' })
    @ApiParam({
        name: 'categoryId', 
        schema: { type: 'string', format: 'UUID', example: '9bb6667c-a8c5-4a61-84e5-de2c6d1b4eeb', description: 'Parameter for the api. The ID of the category' }
    })
    @ApiBody({
        description: 'Fill the body requirements as shown below',
        schema: { type: 'object', properties: {
            categoryName: { type: 'string', example: 'other', description: 'The name of the category, used for ticket categorization' },
        }} })
    @ApiResponse({ status: 200, description: 'A Category is updated successfully and gets stored in the database' })
    @ApiResponse({ status: 400, description: 'Bad request. Could not update that category'})
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'That category was not found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async updateCategory(@Param('categoryId') categoryId: string, @Body() updateCategoryDto: UpdateCategoryDto , @Req()req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub

        updateCategoryDto.categoryId = categoryId

        console.log('Ενημερωνεις ενα category')
        const categoryUpdated = await this.categoryService.updateCategory(updateCategoryDto, userId)

        if (categoryUpdated) {
            console.log('Updated category:', categoryUpdated)
            console.log('Category was updated')
            return res.status(200).json(categoryUpdated)
        }  else return res.status(400).json({ message: 'The category was not updated, check the body' })
    }

    @Delete(':categoryId')
    @ApiOperation({ summary: 'Use this endpoint to delete a single category' })
    @ApiParam({ name: 'categoryId', schema: 
        { type: 'string', format: 'uuid', example: '9bb6667c-a8c5-4a61-84e5-de2c6d1b4eeb', description: 'Unique identifier for the resource' }, 
        required: true })
    @ApiResponse({ status: 200, description: 'Category deleted successfully' })
    @ApiResponse({ status: 401, description: 'User is Unauthorized to proceed' })
    @ApiResponse({ status: 404, description: 'That category was not found' })
    @ApiResponse({ status: 500, description: 'An error occured to the server' })
    public async deleteCategory(@Param('categoryId') categoryId: string, @Req()req: Request, @Res() res: Response) {
        const user = req.res.locals.user
        const userId = user.sub
        console.log('Εδω διαγραφεις ενα category')

        await this.categoryService.deleteCategory(categoryId, userId)

        console.log('Διεγραψες ενα category')
        res.status(200).json({ message: 'That category got deleted.'})
    }
}
