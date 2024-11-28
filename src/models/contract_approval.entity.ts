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

  @Column()
  contractId: number;

  @ManyToOne(() => Contract, (contract) => contract.contractApprovals)
  @JoinColumn({ name: "contractId" })
  contract: Contract;

  @Column()
  templateStepId: number;

  @ManyToOne(() => ApprovalTemplateStep)
  @JoinColumn({ name: "templateStepId" })
  templateStep: ApprovalTemplateStep;

  @Column()
  approverId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "approverId" })
  approver: User;

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
