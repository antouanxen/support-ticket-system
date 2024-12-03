import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import authConfig from '../config/authConfig';
import { ConfigType } from '@nestjs/config';
import { agent } from '@prisma/client';

@Injectable()
export class GenerateTokensService {
    constructor( private readonly jwtService: JwtService,
        @Inject(authConfig.KEY)
        private readonly jwtConfig: ConfigType<typeof authConfig>
    ) {}

    private async signToken<T>(userId: string, expiresIn: number, payload?: T) {
        try {
            return await this.jwtService.signAsync({
                sub: userId,
                ...payload
            }, {
                audience: this.jwtConfig.audience,
                issuer: this.jwtConfig.issuer,
                secret: this.jwtConfig.secret,
                expiresIn
            })
        } catch(err) {
            console.log(`Υπηρξε θεμα με το token για τον χρηστη: ${userId}`, err)
            throw new InternalServerErrorException('Something went wrong with the tokens')
        }
    }

    public async generateTokens(user: agent) {
        try {
            const [accessToken, refreshToken] = await Promise.all([
                this.signToken(user.id, this.jwtConfig.accessTokenTTL, { email: user.agentEmail, tokenVersion: user.tokenVersion }),
                this.signToken(user.id, this.jwtConfig.refreshTokenTTL, { tokenVersion: user.tokenVersion })
            ]);
        
            return { accessToken, refreshToken };
        } catch (err) {
            console.error('Error generating tokens:', err);
            throw new InternalServerErrorException('Error generating tokens');
        }
    }
}
