import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { CreateCategoryDto } from "./create-category.dto";
import { PartialType } from "@nestjs/swagger";

export class UpdateCategoryDto extends PartialType(CreateCategoryDto)  {
    @IsOptional()
    @IsString()
    categoryId?: string
}