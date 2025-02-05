import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SlackModule } from './slack/slack.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    SlackModule,
    ConfigModule.forRoot({
      isGlobal: true, // It makes the config globally available
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
