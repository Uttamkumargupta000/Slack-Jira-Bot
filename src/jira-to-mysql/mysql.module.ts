import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MySqlService } from './mysql.services';
import { MySqlController } from './mysql.controller';
import { Ticket } from './entities/ticket.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket])],
  controllers: [MySqlController],
  providers: [MySqlService],
  exports: [MySqlService]
})
export class MySqlModule {}
