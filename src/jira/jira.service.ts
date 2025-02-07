import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { FetchUpdatedJiraDto, JiraResponseDto, FetchJiraDto } from './dto/fetch-jira.dto';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class JiraService {
  private readonly logger = new Logger(JiraService.name);
  private JIRA_BASE_URL: any;
  private JIRA_AUTH: { username: string; password: string };

  constructor(
    private httpService: HttpService,
  ) {
    this.JIRA_BASE_URL = process.env.JIRA_BASE_URL;

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
              'Authorization': `Basic ${Buffer.from(process.env.JIRA_USERNAME + ':' + process.env.JIRA_API_TOKEN).toString('base64')}`,
              Accept: 'application/json'
            } ,
            params: { jql: 'ORDER BY created DESC', startAt, maxResults },
          }),
        );

        const issues = response.data.issues.map((ticket) => ({
          id: ticket.id,
          key: ticket.key,
          summary: ticket.fields.summary,
        }));

        console.log("Running good and good to go");
        console.log(response);

        // taking the total response data 
        total = response.data.total;
        allTickets = [...allTickets, ...issues];
        startAt += maxResults;

        this.logger.log(`Fetched ${allTickets.length}/${total} tickets.`);
      } catch (error) {
        this.logger.error(`Error Fetching Jira tickets  ${error.message}`);
        console.log('Error detail: ',error.response?.data || error)
        throw error;
      }
    }

    this.logger.log(`Successfully Fetched tickets ${allTickets.length} tickets.`);
    return {issues: allTickets}
  }

  //Fetch only Updated ticket data
  async fetchUpdatedTickets(dto: FetchUpdatedJiraDto): Promise<JiraResponseDto> {
    let startAt = 0;
    const maxResults = 100;
    let updatedTickets : any[] = [];
    let total = 1;

    while(startAt < total) {
      try{
        const response = await lastValueFrom(
          this.httpService.get(`${this.JIRA_BASE_URL}/search`,{
            auth: this.JIRA_AUTH,
            params: {
              jql: `updated >= "${dto.lastFetchTime}" ORDER BY updated DESC`,
              startAt, maxResults,
            },
          }),
        );

        const issues = response.data.issues.map((ticket) => ({
          id: ticket.id,
          key: ticket.key,
          summary: ticket.fields.summary,
        }));

        // updating the stored file while updating and creating data
        total = response.data.total;
        updatedTickets = [...updatedTickets, ...issues];
        startAt += maxResults;

        this.logger.log(`Fetched ${updatedTickets.length}/${total} updated  tickets.`);
      }
      catch(error){
        this.logger.error('Error Fetching updated Jira tickets', error);
        throw error;
      }
    }
    this.logger.log(`Successfully fetched ${updatedTickets.length} updated tickets.`);
    return {issues: updatedTickets};
  }
}