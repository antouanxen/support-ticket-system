import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class AddCommentDto {

    @IsNotEmpty()
    @IsString()
    content: string
    
    @IsOptional()
    @IsUUID()
    ticketId?: string

}