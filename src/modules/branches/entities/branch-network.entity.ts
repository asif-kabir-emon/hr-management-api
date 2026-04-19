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

export enum BranchNetworkType {
  PublicIp = "public_ip",
  BackupIp = "backup_ip",
  VpnIp = "vpn_ip",
  DeviceIp = "device_ip",
  GatewayIp = "gateway_ip",
  WifiSubnet = "wifi_subnet",
  Other = "other",
}

@Entity({ name: "branch_networks" })
export class BranchNetwork {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Branch, (branch) => branch.networks, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "branch_id" })
  branch: Branch;

  @Column({
    type: "enum",
    enum: BranchNetworkType,
    default: BranchNetworkType.PublicIp,
  })
  networkType: BranchNetworkType;

  @Column({ nullable: true })
  label?: string;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  cidr?: string;

  @Column({ nullable: true })
  deviceName?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: "date", nullable: true })
  validFrom?: string;

  @Column({ type: "date", nullable: true })
  validTo?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: false })
  isDeleted: boolean;

  @DeleteDateColumn()
  deletedAt?: Date;
}
