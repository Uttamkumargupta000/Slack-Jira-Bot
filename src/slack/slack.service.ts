import { Injectable } from '@nestjs/common';
import { WebClient } from '@slack/web-api';
import { ConfigService } from '@nestjs/config';
import { SlackEventDto } from './Dto/slackMessage.dto';

@Injectable()
export class SlackService {
  private slackClient: WebClient;

  constructor(private configService: ConfigService) {
    const token = this.configService.get<string>('SLACK_BOT_TOKEN');
    this.slackClient = new WebClient(token);
  }

  async sendMessage(channel: string, text: string) {
    try {
      const response = await this.slackClient.chat.postMessage({
        channel,
        text,
      });
      console.log('Message sent successfully:', response);
      return response as SlackEventDto;
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }
}
