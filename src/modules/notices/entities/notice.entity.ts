import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum NoticeStatus {
  Draft = 'draft',
  Published = 'published',
  Archived = 'archived',
}

@Entity({ name: 'notices' })
export class Notice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: NoticeStatus,
    default: NoticeStatus.Draft,
  })
  status: NoticeStatus;

  @Column({ nullable: true })
  branchId?: string;

  @Column({ nullable: true })
  departmentId?: string;

  @Column('simple-array', { default: '' })
  targetPermissions: string[];

  @Column('simple-array', { default: '' })
  targetUserIds: string[];

  @Column({ default: true })
  isPinned: boolean;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt?: Date;

  @Column({ nullable: true })
  createdByUserId?: string;

  @Column({ nullable: true })
  createdByEmail?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
