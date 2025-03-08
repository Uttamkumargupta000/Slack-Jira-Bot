import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JiraService } from './jira.service';
import { JiraController } from './jira.controller';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { MySqlModule } from 'src/jira-to-mysql/mysql.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), HttpModule, ScheduleModule.forRoot(), MySqlModule],
  controllers: [JiraController],
  providers: [JiraService],
  exports: [JiraService],
})
export class JiraModule {}
