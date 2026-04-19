import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import * as bcrypt from "bcrypt";
import { UserRole } from "../enums/user-role.enum";

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  fullName: string;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.Employee,
  })
  role: UserRole;

  @Column("simple-array", { default: "" })
  permissions: string[];

  @Column({ default: false })
  isDelete: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  failedLoginAttempts: number;

  @Column({ nullable: true })
  lastLoginIp?: string;

  @Column({ nullable: true })
  lastLoginDeviceInfo?: string;

  @Column({ type: "timestamp", nullable: true })
  lastLoginAt?: Date;

  @Column({ nullable: true })
  refreshTokenHash?: string;

  @Column({ type: "timestamp", nullable: true })
  refreshTokenUpdatedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 10);
  }

  async validatePassword(password: string) {
    return bcrypt.compare(password, this.password);
  }
}
