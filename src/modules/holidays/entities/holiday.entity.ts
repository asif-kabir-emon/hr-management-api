import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Department } from '../../departments/entities/department.entity';
import { Employee } from '../../employees/entities/employee.entity';

export enum HolidayType {
  Public = 'public',
  Government = 'government',
  State = 'state',
  Company = 'company',
}

export enum HolidayScopeType {
  All = 'all',
  Department = 'department',
  Employee = 'employee',
  State = 'state',
}

@Entity({ name: 'holidays' })
export class Holiday {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'date' })
  date: string;

  @Column({
    type: 'enum',
    enum: HolidayType,
  })
  type: HolidayType;

  @Column({
    type: 'enum',
    enum: HolidayScopeType,
    default: HolidayScopeType.All,
  })
  scopeType: HolidayScopeType;

  @ManyToOne(() => Department, { eager: true, nullable: true })
  @JoinColumn({ name: 'department_id' })
  department?: Department;

  @ManyToOne(() => Employee, { eager: true, nullable: true })
  @JoinColumn({ name: 'employee_id' })
  employee?: Employee;

  @Column({ nullable: true })
  stateCode?: string;

  @Column({ default: false })
  isOptional: boolean;

  @Column({ default: true })
  isPaid: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
