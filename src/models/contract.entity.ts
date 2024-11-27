import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user.entity";

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
  customer: User;

  // Loại hợp đồng, độ dài tối đa 100 ký tự, có thể null
  @Column({ length: 100, nullable: true })
  contractType: string;

  // Quan hệ nhiều-một với bảng User (người tạo hợp đồng)
  // nullable: false -> bắt buộc phải có người tạo
  @ManyToOne(() => User, { nullable: false })
  createdBy: User;

  // Thời gian tạo hợp đồng, tự động sinh khi tạo record
  @CreateDateColumn()
  createdAt: Date;

  // Thời gian xóa hợp đồng (soft delete), có thể null
  @Column({ type: "timestamp", nullable: true })
  deletedAt: Date;

  // Số lượng người ký hợp đồng
  @Column()
  signersCount: number;

  // Trạng thái hợp đồng: new/pending/signed/rejected
  // Mặc định là 'new' khi tạo mới
  @Column({
    type: "enum",
    enum: ["new", "pending", "signed", "rejected"],
    default: "new",
  })
  status: string;

  // Ghi chú cho hợp đồng, kiểu text và có thể null
  @Column({ type: "text", nullable: true })
  note: string;

  // Đường dẫn tệp PDF, độ dài tối đa 255 ký tự, có thể null
  @Column({ length: 255, nullable: true })
  pdfFilePath: string;
}
