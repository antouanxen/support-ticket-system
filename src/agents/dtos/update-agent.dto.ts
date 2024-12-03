import { IsNotEmpty, IsOptional, IsString, IsUUID, Matches } from "class-validator";

export class UpdateAgentStatsDto {
    @IsOptional()
    @IsString()
    agentIdToUpdate?: string

    @IsOptional()
    @IsString()
    agentName?: string

    @IsOptional()
    @IsString()
    agentEmail?: string

    @IsOptional()
    @IsString()
    @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/, {
        message: 'Password should contain at least 8 characters, with one Capital letter, one Number, and one Special Character'
    })
    agentPassword?: string

    @IsNotEmpty()
    @IsUUID()
    request_id: string

    constructor(partial: Partial<UpdateAgentStatsDto>) {
        Object.assign(this, partial);
    }

}