import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./user.entity";

@Entity({ name: "password_change_histories" })
export class PasswordChangeHistory {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { eager: true, nullable: false })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ nullable: true })
  ip?: string;

  @Column({ nullable: true })
  deviceInfo?: string;

  @CreateDateColumn()
  createdAt: Date;
}
