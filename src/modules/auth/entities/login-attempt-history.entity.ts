import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./user.entity";

@Entity({ name: "login_attempt_histories" })
export class LoginAttemptHistory {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: "user_id" })
  user?: User | null;

  @Column()
  email: string;

  @Column({ nullable: true })
  ip?: string;

  @Column({ nullable: true })
  deviceInfo?: string;

  @Column({ default: false })
  isSuccessful: boolean;

  @Column({ nullable: true })
  failureReason?: string;

  @CreateDateColumn()
  createdAt: Date;
}
