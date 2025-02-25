import { Injectable } from '@nestjs/common';

@Injectable()
export class MessageCacheService {
  private lastMessage = new Map<string, { text: string; timestamp: number }>();

  isDuplicate(userId: string, text: string): boolean {
    const currentTime = Date.now();
    const lastMessage = this.lastMessage.get(userId);

    if (lastMessage && lastMessage.text === text && currentTime - lastMessage.timestamp < 5000) {
      // Ignore duplicate messages within 5 seconds
      return true;
    }

    this.lastMessage.set(userId, { text, timestamp: currentTime });
    return false;
  }
}
