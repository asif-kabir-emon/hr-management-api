import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user.entity";

@Entity({ name: "password_reset_requests" })
export class PasswordResetRequest {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { eager: true, nullable: false })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ unique: true })
  token: string;

  @Column()
  resetUrl: string;

  @Column({ type: "timestamp" })
  expiresAt: Date;

  @Column({ default: false })
  isUsed: boolean;

  @Column({ type: "timestamp", nullable: true })
  usedAt?: Date;

  @Column({ nullable: true })
  requestedIp?: string;

  @Column({ nullable: true })
  requestedDeviceInfo?: string;

  @Column({ nullable: true })
  usedIp?: string;

  @Column({ nullable: true })
  usedDeviceInfo?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
