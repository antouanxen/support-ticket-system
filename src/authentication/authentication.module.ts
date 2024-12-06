import { Global, Module } from '@nestjs/common';
import { AuthenticationController } from './authentication.controller';
import { AuthenticateService } from './providers/authenticate.service';
import { HashingService } from './providers/hashing.service';
import { GenerateTokensService } from './providers/generate-tokens.service';
import { ConfigModule } from '@nestjs/config';
import authConfig from './config/authConfig';
import { JwtModule } from '@nestjs/jwt';
import { RoleModule } from 'src/role/role.module';
import { CategoryModule } from 'src/category/category.module';

@Global()
@Module({
  imports: [ConfigModule.forFeature(authConfig), JwtModule.registerAsync(authConfig.asProvider()), RoleModule, CategoryModule],
  controllers: [AuthenticationController],
  providers: [AuthenticateService, HashingService, GenerateTokensService],
  exports: [AuthenticateService, GenerateTokensService]
})
export class AuthenticationModule {}
