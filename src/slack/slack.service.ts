import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { WebClient } from '@slack/web-api';
import { ConfigService } from '@nestjs/config';
import { SlackEventDto } from './Dto/slack.event.dto';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { query } from 'express';

@Injectable()
export class SlackService {
  private slackClient: WebClient;
  private fastApiUrl: string = process.env.FASTAPI_URL!;

  constructor(
    private configService: ConfigService,
    private httpservice: HttpService,
  ) {
    const token = this.configService.get<string>('SLACK_BOT_TOKEN');
    this.slackClient = new WebClient(token);
    // const fastapiUrl = this.configService.get<string>('FASTAPI_URL')!;
    this.fastApiUrl = `http://localhost:5000/query`;
  }

  async sendMessage(channel: string, text: string) {
    try {
      const response = await this.slackClient.chat.postMessage({
        channel,
        text,
      });
      console.log('Message sent successfully:', response);
      return response;
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  async handleUserQuery(channel: string, userMessage: string) {
    try {
      console.log(`sending message to fastapi : ${userMessage}`);

      // const formattedMessage = userMessage.trim();

      const fastApiResponse = await firstValueFrom(
        this.httpservice.post(
          this.fastApiUrl,
          { query: userMessage },
          { headers: { 'Content-Type': 'application/json' } },
        ),
      );

      //Response from the AI using RAG
      const botResponse = fastApiResponse.data.response;

      return await this.sendMessage(channel, botResponse);
    } catch (error) {
      console.error(`Error Processing User Query: `, error);
      throw new HttpException(
        'Error fetching AI response',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
