import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class CreateRoleDto {
    @IsNotEmpty()
    @IsString()
    role_description: string

}