import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SlackService } from './slack.service';
import { SlackController } from './slack.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [SlackController],
  providers: [SlackService],
})
export class SlackModule {}
