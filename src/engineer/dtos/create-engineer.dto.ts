import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";
import { AuthRoles } from "src/authentication/enums/roles.enum";

export class CreateEngineerDto {
    @IsOptional()
    @IsString()
    engineer_name?: string

    @IsNotEmpty()
    @IsString()
    engineer_email: string

    @IsNotEmpty()
    @IsString()
    @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/, {
        message: 'Password should contain at least 8 characters, with one Capital letter, one Number, and one Special Character'
    })
    engineer_password: string

    @IsOptional()
    @IsEmail()  
    engineerOwnEmail?: string

    @IsOptional()
    @IsString()  
    role_description?: AuthRoles = AuthRoles.ENGINEER

    @IsOptional()
    @IsString()
    categoryName?: string

    constructor(partial: Partial<CreateEngineerDto>) {
        Object.assign(this, partial);
    }
}