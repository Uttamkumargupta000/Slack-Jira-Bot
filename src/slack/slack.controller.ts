import { Controller, Post, Body } from '@nestjs/common';
import { SlackService } from './slack.service';
import { SlackEventDto } from './Dto/slack.event.dto';

@Controller('slack')
export class SlackController {
  constructor(private readonly slackService: SlackService) {}

  @Post('events')
  async handleEventFromSlack(@Body() slackEventDto: SlackEventDto) {
    if (slackEventDto.type === 'url_verification') {
      return { challenge: slackEventDto.challenge };
    }

    if (slackEventDto.event && slackEventDto.event.type === 'message') {
      //to avoid multiple times response from bot
      if (
        slackEventDto.event.bot_id ||
        slackEventDto.event.subtype === 'bot_message'
      ) {
        return { status: 'ok' };
      }
      console.log('New Message Event : ', slackEventDto.event);
      await this.slackService.sendMessage(
        slackEventDto.event.channel,
        ` Received Your Message: ${slackEventDto.event.text}`,
      );
    }
    return { status: 'ok' };
  }
}
