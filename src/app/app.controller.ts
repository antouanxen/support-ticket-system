import { Controller, Get, Res } from '@nestjs/common';
import { AppService } from './app.service'
import { IsPublic } from 'src/authentication/decorators/is-public.decorator';
import { Response } from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @IsPublic(true)
  getHello(@Res() res: Response) {
    res.send('hello fellow <i>Smart Up</i> dudes')
  }
    
}
