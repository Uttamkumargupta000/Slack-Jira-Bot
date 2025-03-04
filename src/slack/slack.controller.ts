import { Controller, Post, Body } from '@nestjs/common';
import { SlackService } from './slack.service';
import { SlackEventDto } from './Dto/slack.event.dto';
import { MessageCacheService } from './messageCacheService';

@Controller('slack')
export class SlackController {
  constructor(private readonly slackService: SlackService, private readonly messageCacheService: MessageCacheService) {}

  @Post('events')
  async handleEventFromSlack(@Body() slackEventDto: SlackEventDto){
    if (slackEventDto.type === 'url_verification') {
      return { challenge: slackEventDto.challenge };
    }

    const event = slackEventDto.event;
    const channel =event?.channel;
    const text = event?.text;
    const user = event?.user

    if (!user || !text || !channel) {
      console.error("Missing required fields in Slack event:", event);
      return { message: "Invalid Slack event structure" };
    }

    if(this.messageCacheService.isDuplicate(user, text)){
      return {message: "duplicate request ignored"}
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

      await this.slackService.handleUserQuery(
        channel, text
      );
      console.log("message send to HandleUserQuery")
    }
    return { status: 'ok' };
  }
}
