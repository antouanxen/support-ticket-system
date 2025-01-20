import { Inject, Injectable } from '@nestjs/common';
import { PaginationQueryDto } from '../dtos/paginationQuery.dto';
import { Paginated } from '../interfaces/paginated.interface';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class PaginationService {
    constructor(
        @Inject(REQUEST)
        private readonly request: Request
    ) {}

    public async paginateResults<T, Args extends { where: any; orderBy?: { [key: string]: 'asc' | 'desc'} | { [key: string]: 'asc' | 'desc'}[] ; skip?: number; take?: number, select?: any, include?: any }>(
        count: (args?: { where: any }) => Promise<number>,
        model: (args?: Args) => Promise<T[]>,
        paginationQueryDto: PaginationQueryDto,
        otherArgs?: Args
    ): Promise<Paginated<T>> {
        const { page, pageSize } = paginationQueryDto

        const skip = (page - 1) * pageSize
        const take = pageSize

        const resultsAfterPagination = await model({ ...otherArgs, skip, take })
        const countTotal = await count({ where: otherArgs?.where })

        // Create the Req URLs via REQUEST body
        const baseUrl = this.request.protocol + '://' + this.request.headers.host + '/'
        const newUrl = new URL(this.request.url, baseUrl)

        // Calculate the exact number of items per page and page total
        const totalItems = await countTotal
        const totalPages = Math.ceil(totalItems/pageSize)
        const nextPage = page === totalPages ? page : page +1
        const previousPage = page === 1 ? page : page -1

        const finalResponse: Paginated<T> = {
            total: totalItems,
            data: resultsAfterPagination,
            meta: {
                currentPage: page,
                allPages: totalPages,
                itemsPerPage: pageSize,
                allItems: totalItems
            },
            links: {
                firstPage: `${newUrl.origin}${newUrl.pathname}?pageSize=${pageSize}&page=1`,
                lastPage: `${newUrl.origin}${newUrl.pathname}?pageSize=${pageSize}&page=${totalPages}`,
                currentPage: `${newUrl.origin}${newUrl.pathname}?pageSize=${pageSize}&page=${page}`,
                nextPage: `${newUrl.origin}${newUrl.pathname}?pageSize=${pageSize}&page=${nextPage}`,
                previousPage: `${newUrl.origin}${newUrl.pathname}?pageSize=${pageSize}&page=${previousPage}`
            }
        }

        return finalResponse
    }
}
