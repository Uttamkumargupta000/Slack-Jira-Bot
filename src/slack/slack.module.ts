import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SlackService } from './slack.service';
import { SlackController } from './slack.controller';
import { HttpModule } from '@nestjs/axios';
import { MessageCacheService } from './messageCacheService';
import { ChatGptModule } from 'src/chatgpt/chatgpt.module';
import { MySqlModule } from 'src/jira-to-mysql/mysql.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }),HttpModule, ChatGptModule, MySqlModule],
  controllers: [SlackController],
  providers: [SlackService,MessageCacheService],
  exports: [MessageCacheService]
})
export class SlackModule {}
