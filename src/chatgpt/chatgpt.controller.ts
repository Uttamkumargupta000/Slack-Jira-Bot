import { Controller, Post, Body } from "@nestjs/common";
import { ChatGptService } from "./chatgpt.service";
import { QueryResult } from "typeorm";


@Controller('chatgpt')
export class ChatGptController {
  constructor(private readonly chatGptService: ChatGptService){}

  @Post('generate-sql')
  async generateSQL(@Body('query') userQuery: string): Promise<string> {
    const { sqlQuery, message } = await this.chatGptService.generateSQLQuery(userQuery);
    return sqlQuery ?? message ?? 'No valid response from chatgpt'
  }

  @Post('format-response')
  async formatResponse(@Body('result') queryResult: any, @Body('query') userQuery: string): Promise<string> {
    return await this.chatGptService.formatResponse(queryResult, userQuery)
  }
}