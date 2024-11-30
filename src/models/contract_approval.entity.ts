import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from "typeorm";
import { Contract } from "./contract.entity";
import { ApprovalTemplateStep } from "./approval_template_step.entity";
import { User } from "./user.entity";

@Entity()
export class ContractApproval {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Contract, (contract) => contract.contractApprovals, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "contractId" })
  contract: Contract;

  @ManyToOne(() => User, {
    nullable: false,
  })
  @JoinColumn({ name: "approverId" })
  approver: User;

  @ManyToOne(() => ApprovalTemplateStep, {
    nullable: false,
  })
  @JoinColumn({ name: "templateStepId" })
  templateStep: ApprovalTemplateStep;

  @Column({
    type: "enum",
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  })
  status: string;

  @Column({ type: "text", nullable: true })
  comments: string;

  @Column({ type: "timestamp", nullable: true })
  approvedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
