import { Controller, Post, Body, Param } from '@nestjs/common';
import { SlackService } from './slack.service';

@Controller('slack')
export class SlackController {
  constructor(private readonly slackService: SlackService) {}

  @Post('events')
  async handleEventFromSlack(@Body() body: any): Promise<any> {
    if(body.type === 'url_verification'){
      return { challenge : body.challenge }
    }

    if(body.event && body.event.type === 'message'){
      
      //to avoid multiple times response from bot
      if(body.event.bot_id || body.event.subtype === 'bot_message'){
        return { status : 'ok'}
      }
      console.log('New Message Event : ',body.event);
      await this.slackService.sendMessage(body.event.channel,`Received Your Message: ${body.event.text}`)

    }
    return { status : 'ok'};
  }
}