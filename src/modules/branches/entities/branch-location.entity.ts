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
import { Branch } from "./branch.entity";

@Entity({ name: "branch_locations" })
export class BranchLocation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Branch, (branch) => branch.locations, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "branch_id" })
  branch: Branch;

  @Column({ default: "main" })
  locationLabel: string;

  @Column()
  addressLine1: string;

  @Column({ nullable: true })
  addressLine2?: string;

  @Column()
  city: string;

  @Column({ nullable: true })
  stateRegion?: string;

  @Column({ nullable: true })
  postalCode?: string;

  @Column()
  country: string;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  latitude?: number;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  longitude?: number;

  @Column()
  timezone: string;

  @Column({ default: true })
  isPrimary: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: false })
  isDeleted: boolean;

  @DeleteDateColumn()
  deletedAt?: Date;
}
