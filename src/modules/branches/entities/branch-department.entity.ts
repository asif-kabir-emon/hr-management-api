import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { Department } from "../../departments/entities/department.entity";
import { Branch } from "./branch.entity";

export enum BranchDepartmentStatus {
  Inactive = 0,
  Active = 1,
}

@Entity({ name: "branch_departments" })
@Unique(["branch", "department"])
export class BranchDepartment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Branch, (branch) => branch.branchDepartments, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "branch_id" })
  branch: Branch;

  @ManyToOne(() => Department, {
    eager: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "department_id" })
  department: Department;

  @Column({ nullable: true })
  localName?: string;

  @Column({ nullable: true })
  floorNo?: string;

  @Column({ nullable: true })
  roomNo?: string;

  @Column({
    type: "int",
    default: BranchDepartmentStatus.Active,
  })
  status: BranchDepartmentStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: false })
  isDeleted: boolean;

  @DeleteDateColumn()
  deletedAt?: Date;
}
