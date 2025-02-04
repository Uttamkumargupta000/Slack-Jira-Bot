import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello GRIP. Lets create a slack-jira-bot';
  }
  
}
