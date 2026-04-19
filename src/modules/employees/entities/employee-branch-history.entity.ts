import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';
import { Employee } from './employee.entity';

export enum EmployeeBranchChangeType {
  Assigned = 'assigned',
  Transferred = 'transferred',
  Removed = 'removed',
}

@Entity({ name: 'employee_branch_histories' })
export class EmployeeBranchHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Employee, { eager: true, nullable: false })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @ManyToOne(() => Branch, { eager: true, nullable: true })
  @JoinColumn({ name: 'from_branch_id' })
  fromBranch?: Branch;

  @ManyToOne(() => Branch, { eager: true, nullable: true })
  @JoinColumn({ name: 'to_branch_id' })
  toBranch?: Branch;

  @Column({
    type: 'enum',
    enum: EmployeeBranchChangeType,
  })
  changeType: EmployeeBranchChangeType;

  @Column({ type: 'date' })
  effectiveDate: string;

  @Column({ nullable: true })
  reason?: string;

  @CreateDateColumn()
  createdAt: Date;
}
