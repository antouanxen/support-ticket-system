import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class UpdateRoleForAgentDto {
    @IsNotEmpty()
    @IsString()
    role_description: string

    @IsOptional()
    @IsUUID()
    agentIdForRole?: string
}