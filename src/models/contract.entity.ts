import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";
import { ApprovalTemplate } from "./approval_template.entity";
import { ContractApproval } from "./contract_approval.entity";

// Đánh dấu class này là một Entity (bảng trong database)
@Entity()
export class Contract {
  // Khóa chính, tự động tăng
  @PrimaryGeneratedColumn()
  id: number;

  // Số hợp đồng, độ dài tối đa 100 ký tự
  @Column({ length: 100 })
  contractNumber: string;

  // Quan hệ nhiều-một với bảng User (khách hàng)
  // nullable: false -> bắt buộc phải có khách hàng
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "customerId" })
  customer: User;

  // Loại hợp đồng, độ dài tối đa 100 ký tự, có thể null
  @Column({ length: 100, nullable: true })
  contractType: string;

  // Thêm quan hệ với ApprovalTemplate
  @ManyToOne(() => ApprovalTemplate, { nullable: false })
  @JoinColumn({ name: "approvalTemplateId" })
  approvalTemplate: ApprovalTemplate;

  // Quan hệ nhiều-một với bảng User (người tạo hợp đồng)
  // nullable: false -> bắt buộc phải có người tạo
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "createdById" })
  createdBy: User;

  // Thời gian tạo hợp đồng, tự động sinh khi tạo record
  @CreateDateColumn()
  createdAt: Date;

  // Thời gian xóa hợp đồng (soft delete), có thể null
  @Column({ type: "timestamp", nullable: true })
  deletedAt: Date;

  // Danh sách người ký
  @OneToMany(() => ContractSigner, (signer) => signer.contract, {
    cascade: true,
  })
  signers: ContractSigner[];

  // Trạng thái hợp đồng: new/pending/signed/rejected
  // Mặc định là 'new' khi tạo mới
  @Column({
    type: "enum",
    enum: [
      "draft",
      "pending_approval",
      "rejected",
      "ready_to_sign",
      "completed",
      "cancelled",
    ],
    default: "draft",
  })
  status: string;

  // Ghi chú cho hợp đồng, kiểu text và có thể null
  @Column({ type: "text", nullable: true })
  note: string;

  // Đường dẫn tệp PDF, độ dài tối đa 255 ký tự, có thể null
  @Column({ length: 255, nullable: true })
  pdfFilePath: string;

  // Add UpdateDateColumn
  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ContractApproval, (approval) => approval.contract)
  contractApprovals: ContractApproval[];

  @OneToMany(() => ContractSigner, (signer) => signer.contract)
  contractSigners: ContractSigner[];

  // Chỉ thêm trường lý do hủy
  @Column({ type: "text", nullable: true })
  cancelReason: string;

  // Add this field in the Contract class
  @Column({ type: "timestamp", nullable: true })
  completedAt: Date;

  // Thêm cột feedback kiểu JSON để lưu array phản hồi
  @Column("json", { nullable: true })
  feedback: ContractFeedback[];
}

// Thêm entity mới cho người ký
@Entity()
export class ContractSigner {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Contract, (contract) => contract.signers, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "contractId" })
  contract: Contract;

  @ManyToOne(() => User, {
    nullable: false,
  })
  @JoinColumn({ name: "signerId" })
  signer: User;

  @Column({
    type: "enum",
    enum: ["pending", "signed"],
    default: "pending",
  })
  status: string;

  @Column()
  signOrder: number;

  @Column({ type: "timestamp", nullable: true })
  signedAt: Date;
}

interface ContractFeedback {
  name: string;
  content: string;
  createdAt: Date;
  tag: "revision_request" | "feedback";
}
