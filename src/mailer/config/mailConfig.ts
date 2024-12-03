import { registerAs } from "@nestjs/config";

export default registerAs('mailConfig', () => ({
    mailHost: process.env.MAIL_HOST,
    smtpUsername: process.env.SMTP_USERNAME,
    smtpPass: process.env.SMTP_PASS
}))