import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryService } from './provider/category.service';

@Module({
  imports: [],
  controllers: [CategoryController],
  providers: [CategoryService],
  exports: [CategoryService]
})
export class CategoryModule {}
