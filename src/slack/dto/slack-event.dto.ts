import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SlackEventDataDto {
  @IsOptional()
  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  user: string;

  @IsOptional()
  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  channel: string;

  @IsOptional()
  @IsString()
  channel_type: string;

  @IsOptional()
  @IsString()
  bot_id: string;
}

export class SlackEventDto {
  @IsOptional()
  @IsString()
  challenge?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SlackEventDataDto)
  event?: SlackEventDataDto;
}
