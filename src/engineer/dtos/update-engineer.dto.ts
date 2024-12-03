import { IsOptional, IsUUID } from "class-validator";
import { CreateEngineerDto } from "./create-engineer.dto";
import { PartialType } from "@nestjs/swagger";

export class UpdateEngineerDto extends PartialType(CreateEngineerDto) {
    @IsOptional()
    @IsUUID()
    engineer_id?: string
}