import { Module } from '@nestjs/common';
import { SlackService } from './slack.service';
import { SlackController } from './slack.controller';

@Module({
  controllers: [SlackController],
  providers: [SlackService],
})
export class SlackModule {}
