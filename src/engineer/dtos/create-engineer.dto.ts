import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateEngineerDto {
    @IsOptional()
    @IsString()
    engineer_name?: string

    @IsNotEmpty()
    @IsString()
    engineer_email: string
    
}