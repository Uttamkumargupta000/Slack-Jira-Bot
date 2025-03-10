import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { WebClient } from '@slack/web-api';
import { ConfigService } from '@nestjs/config';
import { MySqlService } from 'src/jira-to-mysql/mysql.services';
import { ChatGptService } from 'src/chatgpt/chatgpt.service';
import { QueryResult } from 'typeorm';


@Injectable()
export class SlackService {
  private slackClient: WebClient;
  // private fastApiUrl: string = process.env.FASTAPI_URL!;

  constructor(
    private configService: ConfigService,
    private mySqlService: MySqlService,
    private chatGptServices: ChatGptService,
  ) {
    const token = this.configService.get<string>('SLACK_BOT_TOKEN');
    this.slackClient = new WebClient(token);
    // const fastapiUrl = this.configService.get<string>('FASTAPI_URL')!;
    // this.fastApiUrl = `http://localhost:5000/query`;
  }

  // Sends a message to a slack channel
  async sendMessage(channel: string, text: string) {
    try {
      console.log(`Sending message to channel :${channel} | Message: ${text}`)
      const response = await this.slackClient.chat.postMessage({
        channel,
        text,
      });
      console.log('Message sent successfully:', response);
      return response;
    } catch (error) {
      console.error('Error sending  Slack message:', error);
      throw new HttpException('Failed to send slack message', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Handles slack user query, process then via chatgpt, executes SQL Queries, format result, and send the response back to the chaneel
  async handleUserQuery(channel: string, userMessage: string) {
    try {
      console.log(`Debug for : processing message from user in channel : ${channel}`)
      console.log(`Processing user message to Chatgpt : ${userMessage}`);

      // const formattedMessage = userMessage.trim();

      // const fastApiResponse = await firstValueFrom(
      //   this.httpservice.post(
      //     this.fastApiUrl,
      //     { query: userMessage },
      //     { headers: { 'Content-Type': 'application/json' } },
      //   ),
      // );
      //Response from the AI using RAG
      // const botResponse = fastApiResponse.data.response;

      // Generate SQL Query using ChatGpt
      
      const {sqlQuery, message, jqlQuery, jiraSearchLink} = await this.chatGptServices.generateSQLQuery(userMessage);
      if (!sqlQuery) {
        console.log(` SQL Query Not Generated. Response: ${message}`);
        return await this.sendMessage(channel, message ?? 'Unable to process request.');
      }
      
      // If no valid sql is generated, return the message 
      if (!sqlQuery) {
        return await this.sendMessage(channel, message ?? 'Unable to preocess request.');
      }
      console.log(`Generated SQL Query: ${sqlQuery || message}`);

      // Execute the SQL Query
      const queryResult = await this.mySqlService.executeSQLQuery(sqlQuery);
      console.log('Query Result:', queryResult);

      // if no data is found, provide an alternative message
      if (!queryResult || queryResult.length === 0) {
        console.log(`Warning No data found for Query : ${sqlQuery}`)
        return await this.sendMessage(channel, `No relevant data found. Try searching Jira : ${jiraSearchLink}`);
      }

      // Format the SQL Query Result using ChatGpt
      const formattedMessage = await this.chatGptServices.formatResponse(queryResult, userMessage);
      const responseMessage = `📌 **Jira Ticket Results**\n\n${formattedMessage}\n\n🔍 **JQL Query Used:** \`${jqlQuery}\`\n🔗 **More Results:** ${jiraSearchLink}`
      
      console.log(`Debug : sending formatted response to channel: ${channel}`)

      // Send formatted response to Slack
      return await this.sendMessage(channel, responseMessage);
    } catch (error) {
      console.error('Error handling Slack event : ', error);
      // send failure message to Slack
      await this.sendMessage(channel,'Sorry I countered an issue processing your request');
      throw new HttpException('Error processing Slack event', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
