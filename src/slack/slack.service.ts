import { Injectable } from '@nestjs/common';
import { WebClient } from '@slack/web-api';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SlackService {
  private slackClient: WebClient;

  constructor(private configService: ConfigService) {
    const token = this.configService.get<string>('SLACK_BOT_TOKEN')
    this.slackClient = new WebClient(token);
  }


  async sendMessage(channel: string, text: string): Promise<any> {
    try {
      const response = await this.slackClient.chat.postMessage({
        channel,
        text,
      });
      console.log('Message sent successfully');
      return response.message;
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  async fetchMessages(channel: string): Promise<any> {
    try {
      const response = await this.slackClient.conversations.history({ channel });
      console.log(response);
      return response.messages;
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }
}