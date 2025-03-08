import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketDto } from './Dto/ticket.dto';

@Injectable()
export class MySqlService {
  constructor(
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    private dataSource: DataSource,
  ) {this.intitializeDatabase(); }

  // creating schema for database to store the data
  private async intitializeDatabase(): Promise<void> {
    try{
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS tickets(
        tickert_id INT AUTo_INCREMENT PRIMARY KEY,
        id VARCHAR(255) NOT NULL,
        \`KEY\` VARCHAR(5000) NOT NULL,
        summary VARCHAR(5000) NOT NULL,
          description TEXT NULL,
          status VARCHAR(255) NOT NULL,
          assign VARCHAR(255) NULL,
          created_at DATETIME NULL,
          \`update\` DATETIME NULL,
          link VARCHAR(255) NULL,
          issuetype VARCHAR(255) NULL,
          storypoint VARCHAR(50) NULL,
          sprint JSON NULL,
          rootcause TEXT NULL
        );
        `);
        console.log("Database schema Created .");
    } catch(error){
      console.log('Error initializing database schema:', error.message)
      throw new Error("Database schema intialization failed. ");
    }
  }

  // save the data from jira to database 
  async saveTicket(createTicketDto: TicketDto): Promise<Ticket> {
    try {
      const ticketData: Partial<Ticket> ={
        ...createTicketDto,
        storypoint:createTicketDto.storypoint? createTicketDto.storypoint.toString(): "Not Defined",
        rootcause: createTicketDto.rootcause ? createTicketDto.rootcause.toString() : "No Root Cause",
        sprint: createTicketDto.sprint ? createTicketDto.sprint : [],
      }
      console.log('Saving Ticket data :', ticketData)
      const ticket = this.ticketRepository.create(ticketData);
      console.log("final payload 2 : ", ticket)
      return await this.ticketRepository.save(ticket);
      // console.log(`Ticket ${createTicketDto.key} saved successfully`);
    } catch (error) {
      if (error.message.includes("doesn't exist")) {
        console.error('Table missing. Attempting to synchronize...');
        await this.dataSource.synchronize();
        console.log('Table re-created. Retrying ticket save...');
        return this.saveTicket(createTicketDto); 
      }
      console.error('Failed to save ticket:', error.message);
      throw error;
    }
  }

  // Execute an Sql Query and returns the results.

  async executeSQLQuery(sqlQuery: string):Promise<Ticket[]> {
    return await this.dataSource.query(sqlQuery);
  }

}
