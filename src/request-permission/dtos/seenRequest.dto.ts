import { IsDate, IsEnum, IsNotEmpty, IsOptional, IsUUID } from "class-validator";
import { RequestStatus } from "../enums/request_status.enum";

export class SeenRequestDto {
    @IsOptional()
    @IsUUID()
    request_id?: string;

    @IsNotEmpty()
    @IsEnum(RequestStatus)
    request_status: RequestStatus; 

    @IsOptional()
    @IsDate()
    approved_at?: Date | null;

    @IsOptional()
    @IsDate()
    rejected_at?: Date | null;
}