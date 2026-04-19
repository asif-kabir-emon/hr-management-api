import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkflowDefinition } from './workflow-definition.entity';

export enum WorkflowInstanceStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
  Cancelled = 'cancelled',
}

export interface WorkflowStepAction {
  order: number;
  name: string;
  requiredPermission: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  canSelfApprove?: boolean;
  actedAt?: string;
  actedByUserId?: string;
  actedByEmail?: string;
  comments?: string;
}

@Entity({ name: 'workflow_instances' })
export class WorkflowInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => WorkflowDefinition, { eager: true, nullable: false })
  @JoinColumn({ name: 'definition_id' })
  definition: WorkflowDefinition;

  @Column()
  referenceType: string;

  @Column()
  referenceId: string;

  @Column()
  requestedByUserId: string;

  @Column()
  requestedByEmail: string;

  @Column({
    type: 'enum',
    enum: WorkflowInstanceStatus,
    default: WorkflowInstanceStatus.Pending,
  })
  status: WorkflowInstanceStatus;

  @Column({ type: 'integer', nullable: true })
  currentStepOrder?: number | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  steps: WorkflowStepAction[];

  @Column({ nullable: true })
  finalDecisionByUserId?: string;

  @Column({ nullable: true })
  finalDecisionByEmail?: string;

  @Column({ type: 'timestamp', nullable: true })
  finalDecisionAt?: Date;

  @Column({ nullable: true })
  finalComments?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
