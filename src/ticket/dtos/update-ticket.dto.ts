import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { Status } from "../enum/status.enum";

export class UpdateTicketStatusDto {

    @IsUUID()
    @IsString()
    @IsOptional()
    ticketId: string

    @IsEnum(Status)
    @IsNotEmpty()
    status: Status

}