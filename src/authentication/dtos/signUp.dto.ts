import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { AuthRoles } from "../enums/roles.enum";

export class SignUpDto {

    @IsOptional()
    @IsString()
    @MinLength(3)
    @MaxLength(50)
    username?: string

    @IsNotEmpty()
    @IsEmail()
    email: string

    @IsNotEmpty()
    @IsString()
    @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/, {
        message: 'Password should contain at least 8 characters, with one Capital letter, one Number, and one Special Character'
    })
    password: string

    @IsOptional() 
    @IsNotEmpty()   
    role: string | null;

    @IsOptional()
    @IsEmail()
    agentOwnEmail?: string; 

    @IsOptional()
    @IsEmail()
    engineerOwnEmail?: string;

    @IsOptional()
    @IsString()
    category?: string

    constructor(partial: Partial<SignUpDto>) {
        Object.assign(this, partial);
    }

}