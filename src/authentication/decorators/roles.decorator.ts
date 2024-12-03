import { SetMetadata } from '@nestjs/common';
import { AuthRoles } from '../enums/roles.enum';

export const Roles = (roles: AuthRoles | AuthRoles[]) => SetMetadata('AuthRole', roles);
