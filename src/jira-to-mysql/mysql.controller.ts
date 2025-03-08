import { Controller, Post, Body } from '@nestjs/common';
import { MySqlService } from './mysql.services';
import { TicketDto } from './Dto/ticket.dto';
import { ConfigService } from '@nestjs/config';

@Controller('tickets')
export class MySqlController {
  constructor(
    private readonly mySqlService: MySqlService,
  ) {}

  @Post('store-ticket')
  async create(
    @Body() createTicketDto: TicketDto,
    // @Headers('api-key') apiKey: string,
  ) {
    // if (apiKey !== this.configService.get<string>('API_SECRET')) {
    //   throw new UnauthorizedException('Invalid API Key');
    // }
    try {
      return await this.mySqlService.saveTicket(createTicketDto);
    }
    catch(error){
      console.log(`Error storing ticket: ${error.message}`);
    }
  }
}
