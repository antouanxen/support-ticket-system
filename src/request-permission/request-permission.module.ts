import { forwardRef, Module } from '@nestjs/common';
import { RequestPermissionController } from './request-permission.controller';
import { RequestPermissionService } from './provider/request-permission.service';

import { AgentsModule } from 'src/agents/agents.module';

@Module({
  imports: [forwardRef(() =>  AgentsModule)],
  controllers: [RequestPermissionController],
  providers: [RequestPermissionService],
  exports: [RequestPermissionService]
})
export class RequestPermissionModule {}
