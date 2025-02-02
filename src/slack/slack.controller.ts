import { Controller, Post, Body } from '@nestjs/common';
import { SlackService } from './slack.service';
import { SlackEventDto } from './dto/slack-event.dto';

@Controller('slack')
export class SlackController {
  constructor(private readonly slackService: SlackService) {}

  @Post('events')
  async handleSlackEvent(@Body() body: SlackEventDto) {
    console.log('sent the webhook url')

    // Slack URL verification 
    if (body.challenge) {
      return { challenge: body.challenge };
    }

    // Handling message events
    if (body.event?.type === 'message') {
      return this.slackService.respondToMessage(body.event);
    }

    //This helps your webhook stay active and responsive, even if it doesn’t need to take any action.
    return { status:"ok received." };
  }
}


