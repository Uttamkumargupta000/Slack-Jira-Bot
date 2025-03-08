import { Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ChatGptService {
  private openai: OpenAI;
  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  // Converts a Natural language user query into sql query using Chatgpt.
  async generateSQLQuery(
    userQuery: string,
  ): Promise<{ sqlQuery?: string; message?: string }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: `Convert the following into a SQL query that only searches within a table structured like this:\n\n
            Table Name: tickets\n
            Columns: id, key, summary, description, status, assign, link, created_at, update, issuetype, storypoint, sprint, rootcause\n\n
            Identify keywords like 'sprint', 'KYC', 'GC', 'demat', 'last X days', specific ticket IDs (e.g., PT-28940), or creation dates.
            Generate only the SQL query without any additional text. \n\nUser Query: "${userQuery}"`,
          },
        ],
      });
      let chatResponse =
        response.choices[0].message.content?.trim() ??
        'No Reponse From OpenAI.';

      // Fix: Remove Markdown formatting
      chatResponse = chatResponse.replace(/```sql|```/g, '').trim();
      // Check for the correct response contains an actual query
      if (chatResponse === 'NOT_SQL') {
        return { message: 'Not a valid Question, Please Refine your Query' };
      } else if (this.isValidSQL(chatResponse)) {
        return { sqlQuery: chatResponse };
      } else {
        return { message: chatResponse };
      }
    } catch (error) {
      console.error('Error generating response with OpenAI:', error);
      throw new Error('Failed to generate response');
    }
  }

  private isValidSQL(query: string): boolean {
    const sqlKeywords = [
      'SELECT',
      'INSERT',
      'UPDATE',
      'DELETE',
      'CREATE',
      'DROP',
      'ALTER',
    ];
    return sqlKeywords.some((keyword) => query.toUpperCase().includes(keyword));
  }

  // format raw Sql Query results into a human readable repsonse using chatGpt.
  async formatResponse(queryResult: any): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: `Format the following SQL result into a structured response including Ticket ID, Key, Summary, Status, Assigned To, Created At, Updated At, and Link in a clean markdown format:\n\n${JSON.stringify(queryResult)}
            `,
          },
        ],
      });
      const rawResponse =
        response.choices[0].message.content ?? 'No Response From OpenAI';

      return this.formatStructuredResponse(queryResult, rawResponse);
    } catch (error) {
      console.error('Error formatting response with OpenAI:', error);
      throw new Error('Failed to format response');
    }
  }

  private formatStructuredResponse(
    queryResult: any,
    rawResponse: string,
  ): string {
    if (!queryResult || queryResult.length === 0) {
      return '⚠️ *No matching Jira tickets found.*';
    }

    const formattedTickets = queryResult
      .map(
        (ticket: any, index: number) =>
          `🔹 **Ticket ${index + 1}:**  
      🆔 *Ticket ID:* ${ticket.id}  
      🔑 *Key:* ${ticket.key}  
      📝 *Summary:* ${ticket.summary}  
      🏷️ *Status:* ${ticket.status}  
      👤 *Assigned To:* ${ticket.assign ?? 'Unassigned'}  
      📅 *Created At:* ${ticket.created_at}  
      🔄 *Updated At:* ${ticket.update}  
      🔗 *Link:* <${ticket.link}|View Ticket>\n`,
      )
      .join('\n');

    // Append additional info if too many tickets are returned
    const extraMessage =
      queryResult.length > 10
        ? `⚠️ *More than 10 tickets found!* View them all here: [Jira Tickets](<YOUR_JIRA_LINK>)\n`
        : '';

    return `📌 **Jira Ticket Summary**\n\n${formattedTickets}\n${extraMessage}`;
  }
}
