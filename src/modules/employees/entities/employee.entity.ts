import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { encryptedJsonTransformer } from '../../../common/utils/encryption.util';
import { Branch } from '../../branches/entities/branch.entity';
import { Department } from '../../departments/entities/department.entity';

export enum EmploymentStatus {
  Active = 'active',
  OnLeave = 'on_leave',
  Probation = 'probation',
  Resigned = 'resigned',
  Terminated = 'terminated',
}

export interface EmployeePersonalInformation {
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
  nationalIdNumber?: string;
}

export interface EmployeeBankInformation {
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  iban?: string;
  swiftCode?: string;
  routingNumber?: string;
}

export interface EmployeeSalaryInformation {
  baseSalary?: number;
  currency?: string;
  payFrequency?: string;
  allowanceAmount?: number;
}

export interface EmployeeAddressInformation {
  currentAddressLine1?: string;
  currentAddressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  permanentAddressLine1?: string;
  permanentAddressLine2?: string;
  permanentCity?: string;
  permanentState?: string;
  permanentPostalCode?: string;
  permanentCountry?: string;
}

export interface EmployeeJoiningInformation {
  originalJoinDate?: string;
  currentJoinDate?: string;
  confirmationDate?: string;
  probationEndDate?: string;
  lastWorkingDate?: string;
  resignationDate?: string;
  employmentType?: string;
  rejoinCount?: number;
}

@Entity({ name: 'employees' })
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  employeeCode: string;

  @Column()
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  jobTitle?: string;

  @Column({ nullable: true })
  countryCode?: string;

  @Column({ nullable: true })
  stateCode?: string;

  @Column({ type: 'date', nullable: true })
  joinDate?: string;

  @Column({
    type: 'text',
    nullable: true,
    transformer: encryptedJsonTransformer,
  })
  personalInformation: EmployeePersonalInformation;

  @Column({
    type: 'text',
    nullable: true,
    transformer: encryptedJsonTransformer,
  })
  bankInformation: EmployeeBankInformation;

  @Column({
    type: 'text',
    nullable: true,
    transformer: encryptedJsonTransformer,
  })
  salaryInformation: EmployeeSalaryInformation;

  @Column({
    type: 'text',
    nullable: true,
    transformer: encryptedJsonTransformer,
  })
  addressInformation: EmployeeAddressInformation;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  joiningInformation: EmployeeJoiningInformation;

  @Column({
    type: 'enum',
    enum: EmploymentStatus,
    default: EmploymentStatus.Active,
  })
  status: EmploymentStatus;

  @ManyToOne(() => Department, { nullable: true, eager: true })
  @JoinColumn({ name: 'department_id' })
  department?: Department;

  @ManyToOne(() => Branch, { nullable: true, eager: true })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
