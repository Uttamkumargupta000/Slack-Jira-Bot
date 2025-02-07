import { BadRequestException } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import { IsString, IsOptional, IsArray, IsInt, ValidateNested } from 'class-validator';

//  Defines a single Jira Ticket structure 
export class JiraTicketDto {
  @IsString()
  id: string;

  @IsString()
  key: string;

  @IsString()
  summary: string;
}

//  Defines the response structure for Jira tickets 
export class JiraResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JiraTicketDto)
  issues: JiraTicketDto[];
}

//  DTO for fetching all Jira tickets with pagination 
export class FetchJiraDto {
  @IsOptional()
  @Transform((value) => {
    if (isNaN(+value.obj.startAt)) {
      throw new BadRequestException('startAt must be a number');
    }
    return +value.obj.startAt;
  })
  @IsInt()
  startAt: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  maxResults: number;
}

// DTO for fetching only updated Jira tickets
export class FetchUpdatedJiraDto extends FetchJiraDto {
  @IsOptional()
  @IsString()
  lastFetchTime: string;
}
