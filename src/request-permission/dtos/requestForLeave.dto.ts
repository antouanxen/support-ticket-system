import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsUUID } from "class-validator";
import { RequestStatus } from "../enums/request_status.enum";
import { RequestType } from "../enums/requestType.enum";


export class RequestForLeaveDto {
    @IsOptional()
    @IsEnum(RequestStatus)
    request_status?: RequestStatus = RequestStatus.PENDING

    @IsOptional()
    @IsEnum(RequestType)
    requestType?: RequestType = RequestType.PAYED_LEAVE

    @IsNotEmpty()
    @IsNumber()
    numberOfDays: number

}