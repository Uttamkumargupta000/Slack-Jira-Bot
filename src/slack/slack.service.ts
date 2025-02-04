import { Injectable } from '@nestjs/common';


@Injectable()
export class SlackService {
  respondToMessage(event: { 
    type: string; 
    user: string; 
    text: string; 
    channel: string; 
    channel_type?: string;  
    bot_id?: string;        
}){}
    }
