import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SlackModule } from './slack/slack.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JiraModule } from './jira/jira.module';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { AppConfigModule } from './jira-to-mysql/config/config.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './jira-to-mysql/config/typeorm.config';
import { MySqlModule } from './jira-to-mysql/mysql.module';

@Module({
  imports: [
    HttpModule,
    SlackModule,
    JiraModule,
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true, // It makes the config globally available
    }),
    AppConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: typeOrmConfig,
    }),
    MySqlModule,
  ],
  controllers: [AppController],
  providers: [AppService],
  exports: [],
})
export class AppModule {}
