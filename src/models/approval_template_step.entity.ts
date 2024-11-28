import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from "typeorm";
import { ApprovalTemplate } from "./approval_template.entity";
import { Department } from "./department.entity";
import { User } from "./user.entity";

@Entity()
export class ApprovalTemplateStep {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  templateId: number;

  @ManyToOne(() => ApprovalTemplate, (template) => template.steps, {
    onDelete: "CASCADE", // Xóa steps khi xóa template
  })
  @JoinColumn({ name: "templateId" })
  template: ApprovalTemplate;

  @Column()
  departmentId: number;

  @ManyToOne(() => Department)
  @JoinColumn({ name: "departmentId" })
  department: Department;

  @Column()
  approverId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "approverId" })
  approver: User;

  @Column()
  stepOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
