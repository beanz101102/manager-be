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
    role ENUM('admin', 'employee', 'customer', 'manager') DEFAULT 'employee',
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
    status ENUM('draft', 'pending_approval', 'rejected', 'ready_to_sign', 'completed', 'cancelled') DEFAULT 'draft',
    note TEXT,
    cancelReason TEXT,
    pdfFilePath VARCHAR(255),
    FOREIGN KEY (customerId) REFERENCES user(id),
    FOREIGN KEY (approvalTemplateId) REFERENCES approval_template(id),
    FOREIGN KEY (createdById) REFERENCES user(id)
);

-- Table for ContractSigner
CREATE TABLE contract_signer (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contractId INT NOT NULL,
    signerId INT NOT NULL,
    signOrder INT NOT NULL,
    status ENUM('pending', 'signed', 'rejected') DEFAULT 'pending',
    signedAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (contractId) REFERENCES contract(id) ON DELETE CASCADE,
    FOREIGN KEY (signerId) REFERENCES user(id)
);

-- Table for ContractSignature
CREATE TABLE contract_signature (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contractId INT NOT NULL,
    signerId INT NOT NULL,
    signedAt TIMESTAMP NULL,
    status ENUM('pending', 'signed', 'rejected') DEFAULT 'pending',
    signatureImagePath VARCHAR(255),
    pageNumber INT,
    positionX INT,
    positionY INT,
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
    FOREIGN KEY (contractId) REFERENCES contract(id) ON DELETE CASCADE,
    FOREIGN KEY (templateStepId) REFERENCES approval_template_step(id),
    FOREIGN KEY (approverId) REFERENCES user(id)
);

-- Table for ApprovalFlow
CREATE TABLE approval_flow (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contractId INT NOT NULL,
    stepNumber INT NOT NULL,
    approverId INT NOT NULL,
    action VARCHAR(255) NOT NULL,
    actionSource ENUM('internal', 'customer') NOT NULL,
    approvalStatus ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    approvalDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    comments TEXT,
    FOREIGN KEY (contractId) REFERENCES contract(id),
    FOREIGN KEY (approverId) REFERENCES user(id)
);

-- Table for Notification
CREATE TABLE notification (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    contractId INT,
    type ENUM(
        'contract_approval',
        'contract_signed',
        'contract_rejected',
        'contract_modified',
        'contract_commented',
        'contract_to_sign'
    ) NOT NULL,
    message TEXT NOT NULL,
    isRead BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES user(id),
    FOREIGN KEY (contractId) REFERENCES contract(id) ON DELETE CASCADE
);

-- Indexes for optimization
CREATE INDEX idx_contract_number ON contract(contractNumber);
CREATE INDEX idx_contract_status ON contract(status);
CREATE INDEX idx_contract_created_at ON contract(createdAt);
CREATE INDEX idx_signer_status ON contract_signer(status);
CREATE INDEX idx_contract_approval_status ON contract_approval(status);
CREATE INDEX idx_contract_approval_date ON contract_approval(approvedAt);
CREATE INDEX idx_contract_approval_contract_status ON contract_approval(contractId, status);
CREATE INDEX idx_contract_signer_contract_status ON contract_signer(contractId, status);
CREATE INDEX idx_contract_approval_approver ON contract_approval(approverId);
CREATE INDEX idx_contract_signer_signer ON contract_signer(signerId);
CREATE INDEX idx_notification_user ON notification(userId);
CREATE INDEX idx_notification_contract ON notification(contractId);
CREATE INDEX idx_notification_isread ON notification(isRead);
CREATE INDEX idx_notification_created ON notification(createdAt);
CREATE INDEX idx_notification_user_unread ON notification(userId, isRead);
CREATE INDEX idx_approval_flow_contract ON approval_flow(contractId);
CREATE INDEX idx_approval_flow_approver ON approval_flow(approverId);
CREATE INDEX idx_approval_flow_status ON approval_flow(approvalStatus);
CREATE INDEX idx_contract_signature_contract ON contract_signature(contractId);
CREATE INDEX idx_contract_signature_signer ON contract_signature(signerId);
CREATE INDEX idx_contract_signature_status ON contract_signature(status);



