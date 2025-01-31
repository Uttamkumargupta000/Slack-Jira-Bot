import { Controller, Post, Body, Query } from '@nestjs/common';
import { SlackService } from './slack.service';
import { query } from 'express';

@Controller('slack')
export class SlackController {
  constructor(private readonly slackService: SlackService) {}

  @Post('events')
  async handleSlackEvent(@Body() body: any, @Query ('challenge') challenge:string) {
    console.log('sent the webhook url')

    // Slack URL verification 
    
    if(challenge){
      return {challenge}
    }

    // Handling message events
    if (body.event?.type === 'message') {
      return this.slackService.respondToMessage(body.event);
    }

    //This helps your webhook stay active and responsive, even if it doesn’t need to take any action.
    return { status:"ok received." };
  }
}
