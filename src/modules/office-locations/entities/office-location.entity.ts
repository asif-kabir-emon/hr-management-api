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
import { Branch } from '../../branches/entities/branch.entity';

@Entity({ name: 'office_locations' })
export class OfficeLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @ManyToOne(() => Branch, { eager: true, nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;

  @Column({ nullable: true })
  locationLabel?: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  timezone?: string;

  @Column('simple-array', { default: '' })
  trustedIps: string[];

  @Column({ type: 'integer', default: 150 })
  allowedRadiusMeters: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
