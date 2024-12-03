import { IsDateString, IsNotEmpty, IsString, IsUUID } from "class-validator";

export class GetAllCommentsDto {

    @IsNotEmpty()
    @IsUUID()
    id: string

    @IsNotEmpty()
    @IsString()
    content: string

    @IsDateString()
    created_at: Date

    @IsNotEmpty()
    @IsString()
    ticketId: string

    @IsNotEmpty()
    @IsString()
    agentId: string
}