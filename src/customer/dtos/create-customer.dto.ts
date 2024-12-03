import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUrl, Matches, MaxLength } from "class-validator";

export class CreateCustomerDto {
    @IsNotEmpty()
    @IsString()
    @MaxLength(255)
    c_name: string

    @IsOptional()
    @IsString()
    @MaxLength(255)
    company?: string

    @IsNotEmpty()
    @IsEmail()
    @MaxLength(150)
    c_email: string

    @IsOptional()
    @IsString()
    @Matches(/^\+?([0-9\s\-]{7,15})$/, { message: 'The phone number must be a valid format.' })
    c_telNumber: string
}