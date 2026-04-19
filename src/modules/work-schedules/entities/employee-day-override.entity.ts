import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';

export enum EmployeeDayOverrideType {
  OffDay = 'off_day',
  WorkingDay = 'working_day',
  HalfDay = 'half_day',
}

@Entity({ name: 'employee_day_overrides' })
export class EmployeeDayOverride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Employee, { eager: true, nullable: false })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ type: 'date' })
  date: string;

  @Column({
    type: 'enum',
    enum: EmployeeDayOverrideType,
  })
  type: EmployeeDayOverrideType;

  @Column({ nullable: true })
  reason?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
