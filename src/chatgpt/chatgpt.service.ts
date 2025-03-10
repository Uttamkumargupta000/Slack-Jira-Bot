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
  async generateSQLQuery(userQuery: string): Promise<{
    sqlQuery?: string;
    message?: string;
    jqlQuery?: string;
    jiraSearchLink?: string;
  }> {
    try {
      // Security : Block dangerous operations like DELETE OR DROP
      if (this.isRestrictedQuery(userQuery)) {
        return {
          message: 'This Operation is not allowed for security reasons',
        };
      }
      let sqlQuery = '';
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: `Analyze the following user query and generate an SQL query that searches within this table:\n\n
            Table Name: tickets\n
            Columns: id, key, summary, description, status, assign, link, created_at, update, issuetype, storypoint, sprint, rootcause\n\n
            Identify keywords like 'sprint', 'issue type', 'KYC', 'GC', 'demat', 'last X days', specific ticket IDs (e.g., PT-28940), or creation dates.\n\n
        
            **Important Rules:**  \n
            - If the user mentions a sprint (e.g., "Sprint 100"), always format it as **sprint = 'Sprint 100'**.  \n
            - If the user mentions an issuetype (e.g., "bug, adhoc, incident, task, story"), always format it as **issuetype = 'Bug, Adhoc, Incident, Task, Story, etc.'**.\n
            - If the user provides a number (e.g., "100") and mentions 'sprint', assume it refers to a sprint and format it as sprint = 'Sprint 100'.
            - If the user provides a number (e.g., "0.2", "4", "0", "2.5") and mentions 'story point' or 'story points', assume it refers to story points and format it as storypoint = 0.2 (keeping the numeric value as it is). \n
            - When querying dates, use **DATE(created_at) = 'YYYY-MM-DD'** instead of direct equality checks.  \n
            - If the user asks for a count (e.g., "How many tickets in Sprint 100?"), generate a **COUNT query**.  \n
            - If the user asks for specific ticket details (e.g., "Details of PT-28940"), fetch all relevant columns.\n\n
        
            **Ensure the Query:**  
            - If the query requires a count, return the total number of matching records.  
            - If more than 10 results exist, provide a Jira search link using a JQL query.
            - Generate only the SQL query without any additional text.
            - Ignore case sensitivity. Provide data which user asks for regardless of case sensitivity.
            - If query is for sprint summary then analyze all the tickets present in the sprint and give a collective summary for all the ticktes.

            **SECURITY RULES:**  
            -  **NEVER generate DELETE, DROP, or TRUNCATE queries.**  
            -  **NEVER allow full table dumps (e.g., "Show me all tickets").**  
            -  If the user asks for a **count**, return only the COUNT.  
            -  If more than 10 results exist, provide a Jira search link instead.

            **Additional Formatting Rules:**\n
            - Ensure that **issuetype** values always have the first letter capitalized (e.g., "bug" → "Bug", "tech task" → "Tech Task").\n
            - Ensure that **rootcause** values also have the first letter capitalized (e.g., "coding issue" → "Coding Issue").\n\n
        
            **User Query:** "${userQuery}"`,
          },
        ],
      });
      let chatResponse =
        response.choices[0].message.content?.trim() ??
        'No Reponse From OpenAI.';

      // Fix: Remove Markdown formatting
      chatResponse = chatResponse.replace(/```sql|```/g, '').trim();

      // restrict unsafe Queries
      if (this.isRestrictedSQL(chatResponse)) {
        return { message: 'This Query is Not allowed due to security reasons' };
      }
      // Check for the correct response contains an actual query
      if (chatResponse === 'NOT_SQL') {
        return { message: 'Not a valid Question, Please Refine your Query' };
      } else if (this.isValidSQL(chatResponse)) {
        const jiraSearchLink = this.generateJiraSearchLink(chatResponse);
        return { sqlQuery: chatResponse, jiraSearchLink };
      } else {
        return { message: chatResponse };
      }
    } catch (error) {
      console.error('Error generating response with OpenAI:', error);
      throw new Error('Failed to generate response');
    }
  }

  private isRestrictedQuery(userQuery: string): boolean {
    const restrictedPatterns = [
      /\bdelete\b/i,
      /\bdrop\b/i,
      /\btruncate\b/i,
      /\bremove\b/i,
      /\bshow all tickets\b/i,
      /\bfetch all tickets\b/i,
      /\bexport all data\b/i,
    ];
    return restrictedPatterns.some((pattern) => pattern.test(userQuery));
  }

  private isRestrictedSQL(sqlQuery: string): boolean {
    const restrictedPatterns = [
      /\bDELETE\b/i,
      /\bDROP\b/i,
      /\bTRUNCATE\b/i,
      /\bSELECT \*\b/i, // Prevents full table dumps
    ];
    return restrictedPatterns.some((pattern) => pattern.test(sqlQuery));
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

  // Extract relevant conditions from SQL and form JQL (simplified example)
  private generateJiraSearchLink(sqlQuery: string): string {
    const jql = encodeURIComponent(
      sqlQuery.replace('SELECT * FROM tickets WHERE', '').trim(),
    );
    return `https://gripinvest.atlassian.net/issues/?jql=${jql}`;
  }

  // format raw Sql Query results into a human readable repsonse using chatGpt.
  async formatResponse(queryResult: any, userQuery: string): Promise<string> {
    try {
      let sprintDetails = '';
      let isSprintQuery = /sprint\s+\d+/i.test(userQuery); // Check if the query is for a sprint summary

      if (isSprintQuery) {
        // If it's a sprint summary request, combine relevant ticket details
        sprintDetails = queryResult
          .map(
            (ticket: any) =>
              `🆔 *${ticket.key}* - ${ticket.summary}\n  📝 ${ticket.description}\n  🏷 Issue Type: ${ticket.issue_type}\n  🎯 Story Point: ${ticket.story_point ?? 'N/A'}\n  🔍 Root Cause: ${ticket.root_cause ?? 'Not specified'}\n  👤 Assigned To: ${ticket.assign ?? 'Unassigned'}\n`,
          )
          .join('\n');

        userQuery = `Summarize the following Jira tickets for the given sprint:${sprintDetails}`;
      }
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: `Format the following SQL result into a structured response including Ticket ID, Key, Issue Type, Summary, Status, Assigned To, Created At, Updated At, and Link in a clean markdown format:
  
            - If it's about **a specific ticket**, summarize its details, status, and history.
            - If the query is for a particular sprint summary, analyze all ticket descriptions, summaries, issue types and there total count for each type, total number of tickets present in that sprint and provide a consolidated sprint summary.  
            - Include ticket details like Ticket ID, Key, Issue Type, Summary, Status, Assigned To, Created At, Updated At.  
            - If the user asks for a count (e.g., "How many tickets in Sprint 100?"), return **just the total number of tickets present in that sprint**.
            - If the user asks for a specific ticket (e.g., "Details of PT-28940"), provide a **detailed summary**.
            - If the user asks about a sprint, summarize all related tickets and .\n
            
            Query: "${userQuery}"
            SQL Result: ${JSON.stringify(queryResult)}`,
          },
        ],
      });
      const rawResponse =
        response.choices[0].message.content ?? 'No Response From OpenAI';

      return isSprintQuery
        ? rawResponse
        : this.formatStructuredResponse(queryResult, rawResponse);
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
      return '*No matching Jira tickets found.*';
    }
    const count = queryResult?.[0]?.['COUNT(*)'];
    if (count) {
      return `*Total Tickets:* ${count}`;
    } 
      const formattedTickets = queryResult
        .slice(0, 10)
        .map(
          (ticket: any, index: number) =>
            `🔹 *Ticket ${index + 1}:*  
      🆔 *Ticket ID:* ${ticket.ticket_id}  
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
          ? ` *More than 10 tickets found!* View them all here: [Jira Tickets](<${this.generateJiraSearchLink('SELECT * FROM tickets')}>)\n`
          : '';

      return `📌 *Jira Ticket Details\n\n${formattedTickets}\n${extraMessage}`;
    }
}
