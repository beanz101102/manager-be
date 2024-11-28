-- Table for Department
CREATE TABLE department (
    id INT AUTO_INCREMENT PRIMARY KEY,
    departmentName VARCHAR(255) NOT NULL,
    description TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table for User
CREATE TABLE user (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    fullName VARCHAR(255) NOT NULL,
    gender ENUM('Nam', 'Nữ', 'Khác') NOT NULL,
    dateOfBirth DATE,
    placeOfBirth VARCHAR(255),
    address VARCHAR(255),
    idNumber VARCHAR(20) UNIQUE NOT NULL,
    departmentId INT,
    idIssueDate DATE,
    idIssuePlace VARCHAR(255),
    phoneNumber VARCHAR(15),
    email VARCHAR(255) UNIQUE NOT NULL,
    position VARCHAR(100),
    role ENUM('admin', 'employee', 'customer') DEFAULT 'employee',
    username VARCHAR(255) UNIQUE,
    passwordHash VARCHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deletedAt TIMESTAMP NULL,
    refresh_token LONGTEXT,
    active BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (departmentId) REFERENCES department(id)
);

-- Table for ApprovalTemplate
CREATE TABLE approval_template (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table for ApprovalTemplateStep
CREATE TABLE approval_template_step (
    id INT AUTO_INCREMENT PRIMARY KEY,
    templateId INT NOT NULL,
    departmentId INT NOT NULL,
    approverId INT NOT NULL,
    stepOrder INT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (templateId) REFERENCES approval_template(id),
    FOREIGN KEY (departmentId) REFERENCES department(id),
    FOREIGN KEY (approverId) REFERENCES user(id)
);

-- Table for Contract
CREATE TABLE contract (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contractNumber VARCHAR(100) NOT NULL UNIQUE,
    customerId INT NOT NULL,
    contractType VARCHAR(100),
    approvalTemplateId INT NOT NULL,
    createdById INT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deletedAt TIMESTAMP NULL,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    status ENUM('draft', 'pending_approval', 'rejected', 'ready_to_sign', 'completed') DEFAULT 'draft',
    note TEXT,
    pdfFilePath VARCHAR(255) NOT NULL,
    FOREIGN KEY (customerId) REFERENCES user(id),
    FOREIGN KEY (approvalTemplateId) REFERENCES approval_template(id),
    FOREIGN KEY (createdById) REFERENCES user(id)
);

-- Table for ContractSigner (Người ký hợp đồng)
CREATE TABLE contract_signer (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contractId INT NOT NULL,
    signerId INT NOT NULL,
    signOrder INT NOT NULL,
    status ENUM('pending', 'signed') DEFAULT 'pending',
    signedAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (contractId) REFERENCES contract(id),
    FOREIGN KEY (signerId) REFERENCES user(id)
);

-- Table for ContractApproval
CREATE TABLE contract_approval (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contractId INT NOT NULL,
    templateStepId INT NOT NULL,
    approverId INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    comments TEXT,
    approvedAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (contractId) REFERENCES contract(id),
    FOREIGN KEY (templateStepId) REFERENCES approval_template_step(id),
    FOREIGN KEY (approverId) REFERENCES user(id)
);

-- Thêm indexes để tối ưu truy vấn
CREATE INDEX idx_contract_number ON contract(contractNumber);
CREATE INDEX idx_contract_status ON contract(status);
CREATE INDEX idx_contract_created_at ON contract(createdAt);
CREATE INDEX idx_signer_status ON contract_signer(status);
CREATE INDEX idx_contract_approval_status ON contract_approval(status);
CREATE INDEX idx_contract_approval_date ON contract_approval(approvedAt);

-- Thêm indexes mới để tối ưu việc truy vấn người phê duyệt và người ký
CREATE INDEX idx_contract_approval_contract_status ON contract_approval(contractId, status);
CREATE INDEX idx_contract_signer_contract_status ON contract_signer(contractId, status);
CREATE INDEX idx_contract_approval_approver ON contract_approval(approverId);
CREATE INDEX idx_contract_signer_signer ON contract_signer(signerId);



