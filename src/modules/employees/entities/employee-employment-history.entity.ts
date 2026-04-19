import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Employee, EmploymentStatus } from './employee.entity';

export enum EmployeeEmploymentEventType {
  Joined = 'joined',
  Rejoined = 'rejoined',
  Resigned = 'resigned',
  Terminated = 'terminated',
}

@Entity({ name: 'employee_employment_histories' })
export class EmployeeEmploymentHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Employee, { eager: true, nullable: false })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({
    type: 'enum',
    enum: EmployeeEmploymentEventType,
  })
  eventType: EmployeeEmploymentEventType;

  @Column({ type: 'date' })
  effectiveDate: string;

  @Column({
    type: 'enum',
    enum: EmploymentStatus,
  })
  employmentStatus: EmploymentStatus;

  @Column({ nullable: true })
  reason?: string;

  @Column({ nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;
}
