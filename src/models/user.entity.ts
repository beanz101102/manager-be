import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from "typeorm";
import { Department } from "./department.entity";

@Entity()
export class User {
  // Khóa chính, tự động tăng, định danh duy nhất cho mỗi user
  @PrimaryGeneratedColumn()
  id: number;

  // Mã nhân viên/khách hàng, độ dài tối đa 20 ký tự và phải là duy nhất
  @Column({ length: 20, unique: true })
  code: string;

  // Họ tên đầy đủ của người dùng
  @Column({ length: 255 })
  fullName: string;

  // Giới tính, chỉ cho phép 3 giá trị: "Nam", "Nữ", "Khác"
  @Column({ type: "enum", enum: ["Nam", "Nữ", "Khác"] })
  gender: string;

  // Ngày sinh của người dùng
  @Column({ type: "date", nullable: true })
  dateOfBirth: Date;

  // Nơi sinh của người dùng
  @Column({ length: 255, nullable: true })
  placeOfBirth: string;

  // Địa chỉ hiện tại của người dùng
  @Column({ length: 255, nullable: true })
  address: string;

  // Số CMND/CCCD, phải là duy nhất
  @Column({ length: 20, unique: true })
  idNumber: string;

  // Quan hệ nhiều-một với bảng Department (phòng ban)
  @ManyToOne(() => Department, { nullable: true })
  department: Department;

  // Ngày cấp CMND/CCCD
  @Column({ type: "date", nullable: true })
  idIssueDate: Date;

  // Nơi cấp CMND/CCCD
  @Column({ length: 255, nullable: true })
  idIssuePlace: string;

  // Số điện thoại liên hệ
  @Column({ length: 15, nullable: true })
  phoneNumber: string;

  // Địa chỉ email, phải là duy nhất
  @Column({ length: 255, unique: true })
  email: string;

  // Chức vụ trong tổ chức
  @Column({ length: 100, nullable: true })
  position: string;

  // Vai trò người dùng: admin/employee/customer, mặc định là employee
  @Column({
    type: "enum",
    enum: ["admin", "employee", "customer", "manager"],
    default: "employee",
  })
  role: string;

  // Tên đăng nhập, phải là duy nhất
  @Column({ length: 255, unique: true, nullable: true })
  username: string;

  // Mật khẩu đã được mã hóa
  @Column({ length: 255, nullable: true })
  passwordHash: string;

  // Thời gian tạo bản ghi, tự động cập nhật
  @CreateDateColumn()
  createdAt: Date;

  // Thời gian cập nhật bản ghi gần nhất, tự động cập nhật
  @UpdateDateColumn()
  updatedAt: Date;

  // Thời gian xóa bản ghi (soft delete)
  @Column({ type: "timestamp", nullable: true })
  deletedAt: Date;

  // Token làm mới phiên đăng nhập
  @Column({ name: "refresh_token", type: "longtext", nullable: true })
  refreshToken: string;

  // Trạng thái kích hoạt tài khoản
  @Column({ name: "active", type: "boolean", nullable: false, default: false })
  active: boolean;
}
