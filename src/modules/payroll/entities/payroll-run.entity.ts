import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';
import { Department } from '../../departments/entities/department.entity';

export enum PayrollRunStatus {
  Draft = 'draft',
  PendingApproval = 'pending_approval',
  Approved = 'approved',
  Rejected = 'rejected',
  Processed = 'processed',
  Paid = 'paid',
}

@Entity({ name: 'payroll_runs' })
export class PayrollRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'date' })
  periodStart: string;

  @Column({ type: 'date' })
  periodEnd: string;

  @Column({ type: 'date', nullable: true })
  payDate?: string;

  @Column({ nullable: true })
  currency?: string;

  @Column({
    type: 'enum',
    enum: PayrollRunStatus,
    default: PayrollRunStatus.Draft,
  })
  status: PayrollRunStatus;

  @ManyToOne(() => Branch, { nullable: true, eager: true })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;

  @ManyToOne(() => Department, { nullable: true, eager: true })
  @JoinColumn({ name: 'department_id' })
  department?: Department;

  @Column({ nullable: true })
  workflowInstanceId?: string;

  @Column({ nullable: true })
  createdByUserId?: string;

  @Column({ nullable: true })
  createdByEmail?: string;

  @Column({ type: 'integer', default: 0 })
  employeeCount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  grossAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  deductionAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  bonusAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  netAmount: number;

  @Column({ nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
