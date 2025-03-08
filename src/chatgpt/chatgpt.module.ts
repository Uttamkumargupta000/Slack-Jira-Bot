import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ChatGptService } from "./chatgpt.service";
import { ChatGptController } from "./chatgpt.controller";


@Module({
  imports: [HttpModule],
  controllers: [ChatGptController],
  providers: [ChatGptService],
  exports: [ChatGptService],
})
export class ChatGptModule {}