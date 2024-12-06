import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, Matches } from "class-validator"
import { RequestStatus } from "../enums/request_status.enum"
import { RequestType } from "../enums/requestType.enum"

export class RequestForAgentUpdateDto {
    @IsNotEmpty()
    @IsEnum(RequestStatus)
    request_status: RequestStatus = RequestStatus.PENDING

    @IsNotEmpty()
    @IsEnum(RequestType)
    requestType: RequestType = RequestType.AGENT_UPDATE_STATS

    @IsOptional()
    @IsString()
    agentName?: string | null

    @IsOptional()
    @IsString()
    agentEmail: string | null

    @IsOptional()
    @IsString()
    @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/, {
        message: 'Password should contain at least 8 characters, with one Capital letter, one Number, and one Special Character'
    })
    agentPassword?: string

    constructor(partial: Partial<RequestForAgentUpdateDto>) {
        Object.assign(this, partial);
    }

}