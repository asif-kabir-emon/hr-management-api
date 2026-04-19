import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Department } from '../../departments/entities/department.entity';
import { Employee } from './employee.entity';

export enum EmployeeDepartmentChangeType {
  Assigned = 'assigned',
  Transferred = 'transferred',
  Removed = 'removed',
}

@Entity({ name: 'employee_department_histories' })
export class EmployeeDepartmentHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Employee, { eager: true, nullable: false })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @ManyToOne(() => Department, { eager: true, nullable: true })
  @JoinColumn({ name: 'from_department_id' })
  fromDepartment?: Department;

  @ManyToOne(() => Department, { eager: true, nullable: true })
  @JoinColumn({ name: 'to_department_id' })
  toDepartment?: Department;

  @Column({
    type: 'enum',
    enum: EmployeeDepartmentChangeType,
  })
  changeType: EmployeeDepartmentChangeType;

  @Column({ type: 'date' })
  effectiveDate: string;

  @Column({ nullable: true })
  reason?: string;

  @CreateDateColumn()
  createdAt: Date;
}
