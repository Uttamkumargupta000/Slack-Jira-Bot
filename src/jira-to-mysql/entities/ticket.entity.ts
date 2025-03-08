import {Column, PrimaryGeneratedColumn, Entity } from 'typeorm'

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn()
  db_id: number;

  @Column({name: 'ticket_id'})
  id: string;

  @Column()
  key: string;

  @Column({type: 'text'})
  summary: string;

  @Column({type: 'text', nullable: true})
  description: string;

  @Column()
  status: string;

  @Column()
  assign: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  link: string;

  @Column({ type: 'datetime', nullable: true })
  created_at: string;
  
  @Column({ type: 'datetime', nullable: true })
  update: string;
  
  @Column({ nullable: true })
  issuetype: string;

  @Column({type: 'varchar', nullable: true, default: 0})
  storypoint: string;

  @Column('simple-array', {nullable: true})
  sprint: string[];

  @Column({nullable: true})
  rootcause: string;
}
