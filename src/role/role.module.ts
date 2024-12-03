import { Module } from '@nestjs/common';
import { RoleController } from './role.controller';
import { RoleService } from './provider/role.service';

@Module({
  providers: [RoleService],
  controllers: [RoleController],
  exports: [RoleService]
})
export class RoleModule {}
