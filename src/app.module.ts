import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SlackModule } from './slack/slack.module';
import { ConfigModule } from '@nestjs/config';
import { JiraModule } from './jira/jira.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule,
    SlackModule,
    JiraModule,
    ConfigModule.forRoot({
      isGlobal: true, // It makes the config globally available
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
  exports: [],
})
export class AppModule {}
