import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { Company } from "../../companies/entities/company.entity";
import { BranchDepartment } from "./branch-department.entity";
import { BranchLocation } from "./branch-location.entity";
import { BranchNetwork } from "./branch-network.entity";
import { OfficeType } from "./office-type.entity";

export enum BranchStatus {
  Inactive = 0,
  Active = 1,
  Closed = 2,
}

@Entity({ name: "branches" })
@Unique(["company", "code"])
export class Branch {
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
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @ManyToOne(() => OfficeType, { eager: true, nullable: true })
  @JoinColumn({ name: "office_type_id" })
  officeType?: OfficeType;

  @Column({ nullable: true })
  branchType?: string;

  @Column({ name: "manager_employee_id", nullable: true })
  managerEmployeeId?: string;

  @Column({
    type: "int",
    default: BranchStatus.Active,
  })
  status: BranchStatus;

  @Column({ type: "date", nullable: true })
  openedOn?: string;

  @Column({ type: "date", nullable: true })
  closedOn?: string;

  @Column({ nullable: true })
  addressLine1?: string;

  @Column({ nullable: true })
  addressLine2?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  stateCode?: string;

  @Column({ nullable: true })
  countryCode?: string;

  @Column({ nullable: true })
  postalCode?: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => BranchLocation, (location) => location.branch)
  locations: BranchLocation[];

  @OneToMany(() => BranchNetwork, (network) => network.branch)
  networks: BranchNetwork[];

  @OneToMany(
    () => BranchDepartment,
    (branchDepartment) => branchDepartment.branch,
  )
  branchDepartments: BranchDepartment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: false })
  isDeleted: boolean;

  @DeleteDateColumn()
  deletedAt?: Date;
}
