import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, IsUUID, MaxLength } from "class-validator"
import { PriorityLevel } from "../enum/priority.enum"
import { Status } from "../enum/status.enum"
import { Categories } from "src/category/enums/categories.enum"

export class CreateTicketDto {

    @IsNotEmpty()
    @IsString()
    @MaxLength(255)
    c_name: string

    @IsOptional()
    @IsString()
    issue_description: string

    @IsNotEmpty()
    @IsEnum(PriorityLevel)
    priority: PriorityLevel

    @IsNotEmpty()
    @IsString()
    @MaxLength(150)
    categoryName: Categories

    @IsOptional()
    @IsEnum(Status)
    status?: Status  

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    engineerIds?: string | string[]

    @IsOptional()
    @IsUrl()
    @MaxLength(1024)
    featuredImageUrl?: string | null

    @IsOptional()
    @IsString()
    dependent_ticketCustomId?: string | null
}