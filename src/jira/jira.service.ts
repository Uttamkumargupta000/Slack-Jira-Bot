/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import {
  FetchUpdatedJiraDto,
  JiraResponseDto,
  FetchJiraDto,
} from './dto/fetch-jira.dto';
import { lastValueFrom } from 'rxjs';
import { json } from 'stream/consumers';

@Injectable()
export class JiraService {
  private readonly logger = new Logger(JiraService.name);
  private JIRA_BASE_URL: string = process.env.JIRA_BASE_URL!;
  private FASTAPI_URL: string = process.env.FASTAPI_URL!;
  private JIRA_AUTH: { username: string; password: string };

  constructor(private httpService: HttpService) {
    this.JIRA_BASE_URL = process.env.JIRA_BASE_URL!;

    this.JIRA_AUTH = {
      username: process.env.JIRA_USERNAME as string,
      password: process.env.JIRA_API_TOKEN as string,
    };
  }

  //Fetching all the ticket
  async fetchJiraALLTickets(dto: FetchJiraDto): Promise<JiraResponseDto> {
    let { startAt = 0, maxResults = 100 } = dto;
    let allTickets: any[] = [];
    let total = 1;
    while (startAt < total) {
      try {
        const response = await lastValueFrom(
          this.httpService.get(`${this.JIRA_BASE_URL}/search`, {
            headers: {
              Authorization: `Basic ${Buffer.from(process.env.JIRA_USERNAME + ':' + process.env.JIRA_API_TOKEN).toString('base64')}`,
              Accept: 'application/json',
            },
            params: {
              jql: 'project = "PT" and issuetype not in ("Test", "Test Plan", "Test Execution", "Test Set", "Xray Test") ORDER BY created DESC',
              startAt,
              maxResults,
            },
          }),
        );

        //  converting description into string of json format
        const extractTextFromDescription = (description: any): string => {
          if (!description) return 'No Description';

          if (typeof description === 'string') {
            return description; // Already a plain string
          }

          if (description?.content && Array.isArray(description.content)) {
            return description.content
              .map((item) =>
                item.content
                  ? item.content.map((subItem) => subItem.text).join(' ')
                  : '',
              )
              .join('\n');
          }

          return 'Invalid Description Format'; // Fallback
        };

        // const issues = response.data.issues.map((ticket) => ({
        //   id: ticket.id?.toString(),  // Ensure ID is a string
        //   key: ticket.key?.toString(),
        //   summary: ticket.fields?.summary ?? 'No Summary',
        //   description: extractTextFromDescription(ticket.fields?.description) || 'No Description',
        //   status: ticket.fields?.status?.name ?? 'Unknown Status',
        //   assign: ticket.fields?.assignee?.displayName ?? 'Unassigned',  // Renamed for FastAPI compatibility
        //   created_at: ticket.fields?.created ? new Date(ticket.fields.created).toISOString() : 'Unknown Date',
        //   update: ticket.fields?.updated ? new Date(ticket.fields.updated).toISOString() : 'Unknown Date',
        // }));

        const issues = response.data.issues.map((ticket) => {
          const fields = ticket.fields || {}; // Ensure fields exist
          const rootCauseEntry = Object.entries(fields).find(
            ([key, value]) =>
              key.includes('customfield') && key.endsWith('10076'),
          );
          // setting the default value
          let rootcause = 'No Root Cause';

          if (rootCauseEntry) {
            const value = rootCauseEntry[1]; // Extract the field value

            if (typeof value === 'string') {
              rootcause = value; // Direct string value
            } else if (typeof value === 'object' && value !== null) {
              rootcause = (value as any)?.value ?? 'No Root Cause'; // Extract from object
            }
          }

          // Fetching the entire value stored in jira to get the value
          // console.log('Ticket Key:', ticket.key);
          // console.log('Extracted Root Cause:', rootcause);
          // console.log('All Fields:', JSON.stringify(fields, null, 2));
          return {
            id: ticket.id?.toString() || 'No ID',
            key: ticket.key?.toString() || 'No Key',
            summary: fields.summary ?? 'No Summary',
            description:
              extractTextFromDescription(fields.description) ||
              'No Description',
            status: fields.status?.name ?? 'Unknown Status',
            assign: fields.assignee?.displayName ?? 'Unassigned',
            created_at: fields.created
              ? new Date(fields.created).toISOString()
              : 'Unknown Date',
            update: fields.updated
              ? new Date(fields.updated).toISOString()
              : 'Unknown Date',

            // dynamically fetched jira ticket link
            link: `https://gripinvest.atlassian.net/browse/${ticket.key}`, // Jira ticket link
            issuetype: fields.issuetype?.name ?? 'Unknown Issue Type',

            // Fetch Story Points (handling multiple values)
            story_point:
              Object.entries(fields).find(
                ([key, value]) =>
                  key.includes('customfield') &&
                  key.endsWith('10028') &&
                  (typeof value === 'number' || typeof value === 'string'),
              )?.[1] ?? 'Not Estimated',

            // Fetch Sprint (handling multiple sprints)
            sprint: (() => {
              const sprintField = Object.entries(fields).find(
                ([key]) => key.includes('customfield') && key.endsWith('10020'),
              )?.[1];

              if (Array.isArray(sprintField)) {
                return sprintField.map((s) =>
                  s?.name ? s.name : 'Unknown Sprint',
                );
              } else if (
                sprintField &&
                typeof sprintField === 'object' &&
                'name' in sprintField
              ) {
                return [sprintField.name];
              }
              return ['No Sprint'];
            })(),

            rootcause,
            // Fetch Root Cause dynamically
            // rootcause: Object.entries(fields)
            //   .find(([key, value]) => key.toLowerCase().includes('customfield') && key.endsWith('10076') && typeof value === 'string')?.[1] ?? 'No Root Cause',
          };
        });

        // taking the total response data
        total = response.data.total;
        allTickets = [...allTickets, ...issues];

        // if (allTickets.length >= 100) {
        //   allTickets = allTickets.slice(0, 100);
        //   break;
        // }
        console.log('Responses : ', response);
        startAt += maxResults;

        console.log(
          `Fetched ${issues.length} new tickets, total collected : ${allTickets.length}`,
        );

        this.logger.log(`Fetched ${allTickets.length}/${total} tickets.`);
      } catch (error) {
        this.logger.error(`Error Fetching Jira tickets  ${error.message}`);
        console.log('Error detail: ', error.response?.data || error);
        throw error;
      }
    }

    console.log(' Final Payload:', JSON.stringify(allTickets[0], null, 2));
    this.logger.log(
      `Successfully Fetched tickets ${allTickets.length} tickets.`,
    );

    // send fetched tickets to Fastapi for weaviate storeage
    await this.sendToWeaivate(allTickets);
    return { issues: allTickets };
  }

  // Send jira tickets to the fastapi server for storage in weaviate

  async sendToWeaivate(tickets: any[]) {
    try {
      this.logger.log(`Sending ${tickets.length} tickets to FastAPI...`);
      for (const ticket of tickets) {
        if (typeof ticket.description === 'object') {
          ticket.description = JSON.stringify(ticket.description);
        }
        const response = await lastValueFrom(
          this.httpService.post(`${this.FASTAPI_URL}/store-tickets`, [ticket], {
            headers: { 'Content-Type': 'application/json' },
          }),
        );
        this.logger.log(
          `Response from FastAPI: ${JSON.stringify(response.data)}`,
        );
      }
      this.logger.log(`sent ${tickets.length} tickets to Weaviate`);
    } catch (error) {
      this.logger.error(
        `Error sending the tickets to Weaviate: ${error.message}`,
      );
    }
  }

  //Fetch only Updated ticket data
  //   async fetchUpdatedTickets(dto: FetchUpdatedJiraDto): Promise<JiraResponseDto> {
  //     let startAt = 0;
  //     const maxResults = 100;
  //     let updatedTickets : any[] = [];
  //     let total = 1;

  //     while(startAt < total) {
  //       try{
  //         const response = await lastValueFrom(
  //           this.httpService.get(`${this.JIRA_BASE_URL}/search`,{
  //             headers: {
  //               'Authorization': `Basic ${Buffer.from(process.env.JIRA_USERNAME + ':' + process.env.JIRA_API_TOKEN).toString('base64')}`,
  //               Accept: 'application/json'
  //             } ,
  //             params: {
  //               jql: 'project = "PT" and issuetype not in ("Test", "Test Plan", "Test Execution", "Test Set", "Xray Test") ORDER BY created DESC',
  //               startAt, maxResults,
  //             },
  //           }),
  //         );

  //         const issues = response.data.issues.map((ticket) => ({
  //           id: ticket.id,
  //           key: ticket.key,
  //           summary: ticket.fields.summary,
  //           status: ticket.fields.status.name,
  //         }));

  //         // updating the stored file while updating and creating data
  //         total = response.data.total;
  //         updatedTickets = [...updatedTickets, ...issues];
  //         startAt += maxResults;

  //         console.log(response)

  //         this.logger.log(`Fetched ${updatedTickets.length}/${total} updated  tickets.`);
  //       }
  //       catch(error){
  //         this.logger.error('Error Fetching updated Jira tickets', error);
  //         throw error;
  //       }
  //     }
  //     this.logger.log(`Successfully fetched ${updatedTickets.length} updated tickets.`);

  //     // query ai to find the important update in jira
  //     // const aiQueryDto: AIQueryDto = {
  //     //   query: 'find the most important update in jira',
  //     //   tickets: updatedTickets,
  //     // }
  //     // const bestMatch = await this.aiService.queryJiraWithAI(aiQueryDto);
  //     return {issues: updatedTickets};
  //   }
}
