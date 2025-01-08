import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthRoles } from '../enums/roles.enum';
import prisma from 'prisma/prisma_Client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rolesMetadata = await this.reflector.get<AuthRoles | AuthRoles[]>('AuthRole', context.getHandler())
    const requiredRoles = Array.isArray(rolesMetadata) ? rolesMetadata : [rolesMetadata]

    if (!rolesMetadata) return true

    const request = context.switchToHttp().getRequest()
    const userId  = request.res.locals.user?.sub

    const userAgent = await prisma.user.findUnique({
      where: { userId: userId },
      include: { role: true }
    })

    const hasValidRole = requiredRoles.includes(userAgent?.role.role_description as AuthRoles)
    
    if (!hasValidRole) { 
      console.log(`Access denied: User does not have any of the required roles: ${requiredRoles.join(', ')}`)
      throw new ForbiddenException(`That user does not have the right roles to access that resource. Required roles: ${requiredRoles.join(', ')}`); 
    }
    else console.log(`Access granted: User has one of the required roles: ${requiredRoles.join(', ')}`)

    return hasValidRole;
  }
}
