import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./providers/app.service";
import { CommentsModule } from "src/comments/comments.module";
import { TicketModule } from "src/ticket/ticket.module";
import { CategoryModule } from "src/category/category.module";
import { CustomerModule } from "src/customer/customer.module";
import { AuthenticationModule } from "src/authentication/authentication.module";
import { ConfigModule } from "@nestjs/config";
import authConfig from "src/authentication/config/authConfig";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { AccessTokenGuard } from "src/authentication/guards/access-token.guard";
import { JwtModule } from "@nestjs/jwt";
import { TypeOfAuthGuard } from "src/authentication/guards/type-of-auth.guard";
import { RoleModule } from "src/role/role.module";
import { AgentsModule } from "src/agents/agents.module";
import { EngineerModule } from "src/engineer/engineer.module";
import { RequestPermissionModule } from "src/request-permission/request-permission.module";
import { RolesGuard } from "src/authentication/guards/roles.guard";
import { MailModule } from "src/mailer/mail.module";
import { NotificationService } from "./providers/notification.service";
import { NotificationGateway } from "./providers/notification.gateway";
import { NotificationInterceptor } from "./interceptors/notification.interceptor";

@Module({
  imports: [
    AgentsModule,
    CommentsModule,
    TicketModule,
    CategoryModule,
    CustomerModule,
    AuthenticationModule,
    JwtModule.registerAsync(authConfig.asProvider()),
    ConfigModule.forFeature(authConfig),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [authConfig],
      envFilePath: ".env",
    }),
    RoleModule,
    EngineerModule,
    RequestPermissionModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: TypeOfAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: NotificationInterceptor },
    AccessTokenGuard,
    RolesGuard,
    NotificationService,
    NotificationGateway,
  ],
})
export class AppModule {}

// To dos:
// Tickets are now cancel-able and can be re-opened. Assigned Engineers can now get Un-Assigned. Tickets-api for updating both status and priority. Working for file-attachments.
// File attachments such as pdfs and images are now working in the app. Priority is now date-related and can get updated automatically after some certain amount of time has passed.
