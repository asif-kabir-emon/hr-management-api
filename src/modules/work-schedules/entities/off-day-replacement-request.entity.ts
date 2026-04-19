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

export enum OffDayReplacementRequestStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

@Entity({ name: 'off_day_replacement_requests' })
export class OffDayReplacementRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Employee, { eager: true, nullable: false })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ type: 'date' })
  originalOffDate: string;

  @Column({ type: 'date' })
  replacementOffDate: string;

  @Column({ nullable: true })
  reason?: string;

  @Column({
    type: 'enum',
    enum: OffDayReplacementRequestStatus,
    default: OffDayReplacementRequestStatus.Pending,
  })
  status: OffDayReplacementRequestStatus;

  @Column({ nullable: true })
  reviewedByUserId?: string;

  @Column({ nullable: true })
  reviewedByEmail?: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt?: Date;

  @Column({ nullable: true })
  reviewNotes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
