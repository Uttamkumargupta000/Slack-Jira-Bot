import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SlackModule } from './slack/slack.module';
import { ConfigModule } from '@nestjs/config';
import { JiraModule } from './jira/jira.module';
import { JiraService } from './jira/jira.service';
import { JiraController } from './jira/jira.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule,
    SlackModule,
    JiraModule,
    ConfigModule.forRoot({
      isGlobal: true, // It makes the config globally available
    }),
  ],
  controllers: [AppController,JiraController],
  providers: [AppService,JiraService],
  exports: [JiraService]
})
export class AppModule {}
