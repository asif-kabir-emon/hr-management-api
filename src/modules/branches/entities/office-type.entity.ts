import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Company } from "../../companies/entities/company.entity";

export enum OfficeTypeStatus {
  Inactive = 0,
  Active = 1,
}

@Entity({ name: "office_types" })
export class OfficeType {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Company, { eager: true, nullable: true })
  @JoinColumn({ name: "company_id" })
  company?: Company;

  @Column()
  name: string;

  @Column()
  code: string;

  @Column({ nullable: true })
  description?: string;

  @Column({
    type: "int",
    default: OfficeTypeStatus.Active,
  })
  status: OfficeTypeStatus;

  @Column({ default: false })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: false })
  isDeleted: boolean;

  @DeleteDateColumn()
  deletedAt?: Date;
}
