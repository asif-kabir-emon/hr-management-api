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

export enum AttendanceStatus {
  Present = 'present',
  Remote = 'remote',
}

export enum AttendanceApprovalStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

export interface AttendanceLocation {
  latitude: number;
  longitude: number;
  address?: string;
  officeLocationId?: string;
  officeLocationName?: string;
  distanceMetersFromOffice?: number;
  isInsideOffice?: boolean;
  matchedBy?: 'ip' | 'location';
}

export interface AttendanceBreak {
  startAt: string;
  endAt?: string;
  notes?: string;
}

export interface AttendanceDayResolution {
  isWorkingDay: boolean;
  offDay: boolean;
  source: string;
  reason?: string;
  overrideType?: string;
  holiday?: {
    id: string;
    name: string;
    type: string;
    scopeType: string;
    isPaid: boolean;
    isOptional: boolean;
  };
  workSchedule?: {
    id: string;
    name: string;
  };
  dayRule?: {
    isWorkingDay: boolean;
    startTime?: string;
    endTime?: string;
  } | null;
}

@Entity({ name: 'attendance_records' })
export class AttendanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Employee, { eager: true })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ type: 'date' })
  workDate: string;

  @Column({ type: 'timestamp', nullable: true })
  checkInAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  checkOutAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  checkInLocation?: AttendanceLocation;

  @Column({ type: 'jsonb', nullable: true })
  checkOutLocation?: AttendanceLocation;

  @Column({ nullable: true })
  checkInOfficeLocationId?: string;

  @Column({ nullable: true })
  checkInOfficeLocationName?: string;

  @Column({ type: 'integer', nullable: true })
  checkInDistanceMetersFromOffice?: number;

  @Column({ nullable: true })
  isCheckInInsideOffice?: boolean;

  @Column({ nullable: true })
  checkInOfficeMatchedBy?: string;

  @Column({ nullable: true })
  checkOutOfficeLocationId?: string;

  @Column({ nullable: true })
  checkOutOfficeLocationName?: string;

  @Column({ type: 'integer', nullable: true })
  checkOutDistanceMetersFromOffice?: number;

  @Column({ nullable: true })
  isCheckOutInsideOffice?: boolean;

  @Column({ nullable: true })
  checkOutOfficeMatchedBy?: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  breakRecords: AttendanceBreak[];

  @Column({ default: false })
  isOffDayAttendance: boolean;

  @Column({ nullable: true })
  offDayType?: string;

  @Column({ type: 'jsonb', nullable: true })
  dayResolution?: AttendanceDayResolution;

  @Column({
    type: 'enum',
    enum: AttendanceStatus,
    default: AttendanceStatus.Present,
  })
  status: AttendanceStatus;

  @Column({
    type: 'enum',
    enum: AttendanceApprovalStatus,
    default: AttendanceApprovalStatus.Pending,
  })
  approvalStatus: AttendanceApprovalStatus;

  @Column({ nullable: true })
  approvedByUserId?: string;

  @Column({ nullable: true })
  approvedByEmail?: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @Column({ nullable: true })
  approvalNotes?: string;

  @Column({ nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
