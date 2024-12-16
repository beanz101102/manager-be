import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";
import { Contract } from "./contract.entity";

@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "userId" })
  user: User;

  @ManyToOne(() => Contract, { nullable: true })
  @JoinColumn({ name: "contractId" })
  contract: Contract;

  @Column({
    type: "enum",
    enum: [
      "contract_approval", // Cần phê duyệt hợp đồng
      "contract_signed", // Hợp đồng đã được ký
      "contract_rejected", // Hợp đồng bị từ chối
      "contract_modified", // Hợp đồng được chỉnh sửa
      "contract_commented", // Hợp đồng có nhận xét mới
      "contract_to_sign", // Cần ký hợp đồng
      "contract_cancelled", // Hợp đồng đã bị hủy
      "contract_feedback", // Hợp đồng có phản hồi mới
    ],
  })
  type: string;

  @Column({ type: "text" })
  message: string;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
