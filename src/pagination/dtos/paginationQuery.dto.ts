import { IsOptional, IsPositive } from "class-validator";

export class PaginationQueryDto {

    @IsOptional()
    @IsPositive()
    page?: number = 1

    @IsOptional()
    @IsPositive()
    pageSize?: number = 8
}