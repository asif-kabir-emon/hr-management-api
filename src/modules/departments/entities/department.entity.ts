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
import { Company } from "../../companies/entities/company.entity";

export enum DepartmentStatus {
  Inactive = 0,
  Active = 1,
}

@Entity({ name: "departments" })
@Unique(["company", "code"])
export class Department {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Company, { eager: true, nullable: true })
  @JoinColumn({ name: "company_id" })
  company?: Company;

  @Column()
  name: string;

  @Column({ nullable: true })
  code?: string;

  @Column({ nullable: true })
  description?: string;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: "parent_department_id" })
  parentDepartment?: Department;

  @Column({
    type: "int",
    default: DepartmentStatus.Active,
  })
  status: DepartmentStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: false })
  isDeleted: boolean;

  @DeleteDateColumn()
  deletedAt?: Date;
}
