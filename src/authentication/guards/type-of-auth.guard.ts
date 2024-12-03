import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AccessTokenGuard } from './access-token.guard';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

@Injectable()
export class TypeOfAuthGuard implements CanActivate {

  constructor(
    private readonly reflector: Reflector,
    private readonly accessTokenGuard: AccessTokenGuard,
    private readonly rolesGuard: RolesGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest()
    console.log('Request URL:', req.url, req.method);
    console.log(req.body)

    const isPublicRoute = await this.reflector.getAllAndOverride('IsPublic', [context.getHandler(), context.getClass()])
    console.log('IsPublicRoute:', isPublicRoute)

    if (isPublicRoute) return true
    else if (!isPublicRoute) await this.accessTokenGuard.canActivate(context)

    return await this.rolesGuard.canActivate(context)
  }
}
