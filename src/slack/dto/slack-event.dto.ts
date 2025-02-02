import { IsOptional, IsString } from 'class-validator';

export class SlackEventDto {
  @IsString()
  challenge?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  event?: {
    type?: string;
    user?: string;
    text?: string;
    channel?: string;
  };
}
