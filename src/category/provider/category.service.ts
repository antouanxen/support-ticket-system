import { Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateCategoryDto } from '../dtos/create-category.dto';
import prisma from 'prisma/prisma_Client';
import { category } from '@prisma/client';
import { UpdateCategoryDto } from '../dtos/update-category.dto';

@Injectable()
export class CategoryService {
    constructor() {}

    public async createCategory(createCategoryDto: CreateCategoryDto, userId: string): Promise<category | { message: string }> {
        const agentId = userId

        if (!agentId) throw new NotFoundException('User does not exist')

        try {
            const existingCategory = await prisma.category.findUnique({
                where: { categoryName: createCategoryDto.categoryName }
            })

            if (existingCategory) return { message: 'That name of category already exists' };
            
            const newCategory = await prisma.category.create({
                data: {
                    categoryName: createCategoryDto.categoryName.toLowerCase().replace(/\s+/g, '_')
                }
            })

            return newCategory
        } catch(err) {
            console.log('Category was not created', err)
            throw new InternalServerErrorException('There was an error with the server. Try again')
        }
    }

    public async getAllCategories(userId: string): Promise<category[]> {
        const agentId = userId

        if (!agentId) throw new NotFoundException('User does not exist')

        try {
            const categoryList = await prisma.category.findMany({
                include: { ticket: true }
            })

            if (categoryList && categoryList.length > 0) {
                return categoryList
            } else return []
        } catch(err: any) {
            console.log('No categories were returned', err)
            throw new InternalServerErrorException('There was an error with the server. Try again')
        }
    }    

    public async getSingleCategoryByName(categoryName: string): Promise<category> {
        try {
            const singleCategory = await prisma.category.findFirst({
                where: { categoryName: categoryName },
                include: { ticket: true }
            })

            if (!singleCategory) throw new NotFoundException('That category was not found')

            return singleCategory
        } catch(err: any) {
            console.log('Could not find the category', err)
            throw new NotFoundException('There was an error finding that category')
        }
    }

    public async findCategoryById(id: string): Promise<category> {
        try {
            const singleCategory = await prisma.category.findUnique({ where: { id: id } })

            if (!singleCategory) throw new NotFoundException('That category does not exist. Try again')

            return singleCategory
        } catch (err) {
            console.log('There was an error finding that category', err)
            throw new NotFoundException('There was an error finding the exact category')
        }
    }

    public async updateCategory(updateCategoryDto: UpdateCategoryDto, userId: string): Promise<Partial<category>> {
        const { categoryId, categoryName } = updateCategoryDto
        const agentId = userId

        if (!agentId) throw new NotFoundException('User does not exist')

        try {
            const categoryToBeUpdated = await prisma.category.findUnique({
                where: { id: categoryId }
            })

            if (!categoryToBeUpdated) throw new NotFoundException('Category not found');
            
            const updatedCategory = await prisma.category.update({
                where: { id: categoryId },
                data: {
                    categoryName: categoryName ?? categoryToBeUpdated.categoryName,
                    updated_at: new Date()
                }
            })

            return updatedCategory
        } catch(err) {
            console.log('Error updating the category', err)
            throw new InternalServerErrorException(`Category ${updateCategoryDto.categoryName} was not updated due to server error`)
        }
    }

    public async deleteCategory(categoryId: string, userId: string) {
        const agentId = userId

        if (!agentId) throw new NotFoundException('User does not exist')

        try {
            const categoryToBeDeleted = await prisma.category.findUnique({
                where: { id: categoryId }
            })

            if (!categoryToBeDeleted) throw new NotFoundException('Category not found');

            await prisma.category.delete({ where: { id: categoryId } })

            return;
        } catch(err) {
            console.log('Error deleting the category', err)
            throw new InternalServerErrorException(`Category was not deleted due to server error`)
        }  
    }
}
