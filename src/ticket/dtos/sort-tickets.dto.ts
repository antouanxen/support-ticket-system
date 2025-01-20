import OrderByField from "utils/OrderByField.type";
import DirectionField from "utils/DirectionField.type";
import { IsOptional, IsString} from "class-validator";
import { PaginationQueryDto } from "src/pagination/dtos/paginationQuery.dto";

export class SortTicketsDto extends PaginationQueryDto {
   
    @IsOptional()
    @IsString()
    orderBy?: OrderByField
    
    @IsOptional()
    @IsString()
    direction?: DirectionField
}