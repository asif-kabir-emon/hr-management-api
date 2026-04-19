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
import { PayrollRun } from './payroll-run.entity';

export interface PayrollSalarySnapshot {
  baseSalary: number;
  allowanceAmount: number;
  currency?: string;
  payFrequency?: string;
  branchName?: string;
  departmentName?: string;
  employeeStatus?: string;
}

@Entity({ name: 'payroll_items' })
export class PayrollItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PayrollRun, { nullable: false })
  @JoinColumn({ name: 'payroll_run_id' })
  payrollRun: PayrollRun;

  @ManyToOne(() => Employee, { eager: true, nullable: false })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  salarySnapshot: PayrollSalarySnapshot;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  baseSalary: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  allowanceAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  bonusAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  deductionAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  grossAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  netAmount: number;

  @Column({ nullable: true })
  remarks?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
