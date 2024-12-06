import { IsEmail, IsNotEmpty, IsString, Matches } from "class-validator"

export class SignInDto {
    @IsNotEmpty()
    @IsEmail()
    email: string

    @IsNotEmpty()
    @IsString()
    @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/, {
        message: 'Password should contain at least 8 characters, with one Capital letter, one Number, and one Special Character'
    })
    password: string
}