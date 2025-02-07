import { Controller, Get, Query } from '@nestjs/common';
import { JiraService } from './jira.service';
import { FetchJiraDto, FetchUpdatedJiraDto, JiraResponseDto } from './dto/fetch-jira.dto';


@Controller('jira')
export class JiraController {
  constructor(private readonly jiraService: JiraService) {}

  //Fetch all ticket 
  @Get('fetch-all')
  async fetchJiraTickets(@Query() dto: FetchJiraDto): Promise<JiraResponseDto>{
    return await this.jiraService.fetchJiraALLTickets(dto);
  }

  // Fetch only Updated Ticket 
  @Get('fetch-updated')
  async fetchUpdatedJiraTickets(@Query() dto: FetchUpdatedJiraDto){
    return await this.jiraService.fetchJiraALLTickets(dto)
  }
}
