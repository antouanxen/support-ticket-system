import OrderByField from "utils/OrderByField.type";
import DirectionField from "utils/DirectionField.type";
import { IsDateString, IsOptional, IsString} from "class-validator";

export class SortTicketsDto {
    @IsString()
    @IsOptional()
    orderBy: OrderByField
    
    @IsString()
    @IsOptional()
    direction: DirectionField

}