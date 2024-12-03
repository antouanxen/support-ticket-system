import { IsNotEmpty, IsUUID } from "class-validator";

export class AssignTicketToEngDto {
    @IsNotEmpty()
    @IsUUID()
    ticket_id: string

    @IsNotEmpty()
    @IsUUID()
    engineer_id: string

}