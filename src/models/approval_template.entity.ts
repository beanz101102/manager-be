import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ApprovalTemplateStep } from "./approval_template_step.entity";
import { User } from "./user.entity";

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

  @Column()
  createdById: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "createdById" })
  createdBy: User;

  @Column({
    type: "enum",
    enum: ["active", "inactive", "deleted"],
    default: "active",
  })
  status: "active" | "inactive" | "deleted";

  @Column({
    type: "enum",
    enum: ["single", "multiple"],
    default: "single",
  })
  usageType: "single" | "multiple"; // Phân biệt template dùng 1 lần hay nhiều lần
}
