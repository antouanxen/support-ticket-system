import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import authConfig from '../config/authConfig';
import { Request } from 'express';
import prisma from 'prisma/prisma_Client';
import { GenerateTokensService } from '../providers/generate-tokens.service';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwtservice: JwtService,
    @Inject(authConfig.KEY)
    private readonly jwtConfig: ConfigType<typeof authConfig>,
    private readonly generateTokensService: GenerateTokensService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean>  {
    const request = context.switchToHttp().getRequest()
    const response = context.switchToHttp().getResponse()
    const token = this.extractTheToken(request)
    const refreshToken = request.cookies['refresh-token']

    if (token) {
      try {
        const payload = await this.jwtservice.verifyAsync(token, { 
          secret: this.jwtConfig.secret,
          audience: this.jwtConfig.audience,
          issuer: this.jwtConfig.issuer
        })
        const user = payload?.sub ? await prisma.user.findUnique({ 
          where: { id: payload.sub },
          include: { role: true } 
        }) : null

        if (!user || user.tokenVersion !== payload.tokenVersion) throw new UnauthorizedException('Token verification has failed. Try again.')
  
        request.res.locals.user = payload
        console.log('payload', payload)
      
        return true;
      } catch(err) {
        console.log('Tο access token ειναι invalid.')
        throw new UnauthorizedException('Token verification in access token has failed. Try again.')      
      }
    }     
    
    if (refreshToken) {
      try {
        const payload = await this.jwtservice.verifyAsync(refreshToken,{
          secret: this.jwtConfig.secret,
          audience: this.jwtConfig.audience,
          issuer: this.jwtConfig.issuer
        })
        const user = payload?.sub ? await prisma.user.findUnique({ 
          where: { id: payload.sub },
          include: { role: true } 
        }) : null

        if (!user || user.tokenVersion !== payload.tokenVersion) {
          console.log('Το token ειναι παλιο')
          throw new UnauthorizedException('Token verification has failed. Try again.')
        }

        request.res.locals.user = payload     
        console.log('payload', payload)

        return true;
      } catch(err) {
        console.log('Tο refresh token ειναι invalid.')
        throw new UnauthorizedException('Token verification in refresh token has failed. Try again.')
      }
    }
    throw new UnauthorizedException('No tokens provided, log in first.')
  }

  private extractTheToken(request: Request): string | undefined {
    const [_, token] = request.headers.authorization?.split(' ') ?? []

    return token
  }
}
