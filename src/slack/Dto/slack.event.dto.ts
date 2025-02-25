import { Type } from "class-transformer";
import { IsOptional, IsString, ValidateNested } from "class-validator";

 export class SlackEventDataTypeDto{
  @IsOptional()
  @IsString()
  user?: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  type?: string;
  
  @IsOptional()
  @IsString()
  channel: string;

  @IsOptional()
  @IsString()
  channel_types: string;

  @IsOptional()
  @IsString()
  bot_id: string;

  @IsOptional()
  @IsString()
  subtype: string;

  @IsOptional()
  @IsString()
  status: string;
 }

 export class SlackEventDto{
  @IsOptional()
  @IsString()
  challenge?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SlackEventDataTypeDto)
  event?: SlackEventDataTypeDto
 }
 