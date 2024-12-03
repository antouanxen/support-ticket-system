import { Global, Module } from '@nestjs/common';
import { MailService } from './provider/mail.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { EjsAdapter } from '@nestjs-modules/mailer/dist/adapters/ejs.adapter'

@Global()
@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async () => ({
        transport: {
          host: process.env.MAIL_HOST,
          secure: false, 
          port:  2525,
          auth: {
            user: process.env.SMTP_USERNAME,
            pass: process.env.SMTP_PASS
          }
        },
        default: {
          from: `Support Team <no-reply@support-ticket-team.com>`
        },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new EjsAdapter()
        }
      }) 
    })
  ],
  providers: [MailService],
  exports: [MailService]
})
export class MailModule {}
