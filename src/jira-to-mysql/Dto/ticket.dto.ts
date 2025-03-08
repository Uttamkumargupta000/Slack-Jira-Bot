import { IsArray, IsNumberString, IsOptional, IsString } from "class-validator";

export class TicketDto {
  @IsString()
  ticket_id?: string;

  @IsString()
  key: string;

  @IsString()
  summary: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  assign: string;

  @IsString()
  status: string;

  @IsString()
  created_at: string;

  @IsString()
  update: string;

  @IsString()
  link: string;

  @IsOptional()
  @IsString()
  issuetype: string;

  @IsOptional()
  @IsString()
  storypoint?: number | string | null = 0;

  @IsOptional()
  @IsArray()
  sprint?: string[];

  @IsOptional()
  @IsString()
  rootcause?: string;
}