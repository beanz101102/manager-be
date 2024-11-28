import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { ApprovalTemplateStep } from "./approval_template_step.entity";

@Entity()
export class ApprovalTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => ApprovalTemplateStep, (step) => step.template, {
    cascade: true, // Cho phép lưu/cập nhật steps cùng lúc với template
  })
  steps: ApprovalTemplateStep[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
