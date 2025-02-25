import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SlackService } from './slack.service';
import { SlackController } from './slack.controller';
import { HttpModule } from '@nestjs/axios';
import { MessageCacheService } from './messageCacheService';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }),HttpModule],
  controllers: [SlackController],
  providers: [SlackService,MessageCacheService],
  exports: [MessageCacheService]
})
export class SlackModule {}
