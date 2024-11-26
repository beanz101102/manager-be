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

-- Table for Contract
CREATE TABLE contract (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contractNumber VARCHAR(100) NOT NULL,
    customerId INT NOT NULL,
    contractType VARCHAR(100),
    createdById INT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deletedAt TIMESTAMP NULL,
    signersCount INT NOT NULL,
    status ENUM('new', 'pending', 'signed', 'rejected') DEFAULT 'new',
    note TEXT,
    FOREIGN KEY (customerId) REFERENCES user(id),
    FOREIGN KEY (createdById) REFERENCES user(id)
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

-- Table for ContractAttachment
CREATE TABLE contract_attachment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contractId INT NOT NULL,
    fileName VARCHAR(255),
    filePath VARCHAR(500) NOT NULL,
    fileType VARCHAR(50),
    uploadedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploadedById INT,
    attachmentPurpose ENUM('contract_display', 'note') NOT NULL,
    FOREIGN KEY (contractId) REFERENCES contract(id),
    FOREIGN KEY (uploadedById) REFERENCES user(id)
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

-- Table for UserSignature
CREATE TABLE user_signature (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    signatureImagePath VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES user(id)
);



