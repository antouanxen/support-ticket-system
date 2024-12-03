import { forwardRef, Module } from '@nestjs/common';
import { AgentsController } from './agents.controller';
import { AgentsService } from './provider/agents.service';
import { RoleModule } from 'src/role/role.module';
import { RequestPermissionModule } from 'src/request-permission/request-permission.module';
import { FindAssignedAgentsService } from './provider/find_assigned_agents.service';

@Module({
  imports: [RoleModule, forwardRef(() => RequestPermissionModule)],
  controllers: [AgentsController],
  providers: [AgentsService, FindAssignedAgentsService],
  exports: [AgentsService, FindAssignedAgentsService]
})
export class AgentsModule {}
