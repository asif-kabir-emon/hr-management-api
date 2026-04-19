import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';
import { LeaveTypeEntity } from './leave-type.entity';

@Entity({ name: 'employee_leave_balances' })
@Unique('uq_employee_leave_balance_year', ['employee', 'leaveType', 'year'])
export class EmployeeLeaveBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Employee, { eager: true, nullable: false })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @ManyToOne(() => LeaveTypeEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'leave_type_id' })
  leaveType: LeaveTypeEntity;

  @Column({ type: 'integer' })
  year: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAllocated: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  used: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  pending: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  carryForward: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
