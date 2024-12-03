import { IsNotEmpty, IsOptional, IsUUID } from "class-validator";

export class AssignAgentDto {
    @IsNotEmpty()
    @IsUUID()
    supervisorId: string

    @IsOptional()
    @IsUUID()
    agentIdToGetAssigned: string
}