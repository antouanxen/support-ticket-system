import { IsArray, IsDate, IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from "class-validator"
import { PriorityLevel } from "../enum/priority.enum"
import { Status } from "../enum/status.enum"

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
    categoryName: string

    @IsOptional()
    @IsEnum(Status)
    status?: Status  

    @IsOptional()
    @IsDate()
    due_date: string

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