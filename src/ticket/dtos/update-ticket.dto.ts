import { IsEnum, IsOptional, IsString } from "class-validator";
import { Status } from "../enum/status.enum";
import { PriorityLevel } from "../enum/priority.enum";

export class UpdateTicketStatusDto {
    @IsString()
    @IsOptional()
    customTicketId: string

    @IsEnum(Status)
    @IsOptional()
    status: Status

    @IsEnum(PriorityLevel)
    @IsOptional()
    priority: PriorityLevel

}