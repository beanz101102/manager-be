import express from "express";
import cors from 'cors';
import cookieSession from "cookie-session";
import path from "path";
import dataSource from "./database/data-source";
import AppConfig from "./config/app.config";
import AuthRouter from "./routers/auth.router";
import UserRouter from "./routers/user.router";
import ContractRouter from "./routers/contract.router";
// import AuthMiddleware from "./middlewares/auth.middlewares";
import DepartmentRouter from "./routers/department.router";
import ContractAttachmentRouter from "./routers/contractAttachment.router";
import fs from "fs";
import UserSignatureRouter from "./routers/userSignature.router";
import ContractSignatureRouter from "./routers/contractSignature.router";
import ApprovalFlowRouter from "./routers/approvalFlow.router";
import notificationRouter from "./routers/notification.router";

class App {
  private app: express.Application = express();

  private appConfig = new AppConfig();

  constructor() {
    this.bootstrap();
  }

  public bootstrap(): void {
    this.setupMiddlewares();
    // this.serveStaticFiles();
    this.listen();
  }

  // Static  files
  /* private serveStaticFiles(): void {
        this.app.use(express.static(path.join(__dirname, 'FileName'), { maxAge:  this.appConfig.expiredStaticFiles}));
    } */
  private setupMiddlewares(): void {
    this.app.use(cors({
      origin: function(origin, callback) {
        const allowedOrigins = [
          'https://app.phatdat.online',
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'http://localhost:4000',
          'http://127.0.0.1:4000',
          'https://contract-manager-five.vercel.app'
        ];
        console.log('Request from origin:', origin);
        
        if (!origin) {
          return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
          return callback(null, origin);
        }

        callback(new Error('CORS policy violation'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Content-Length', 'X-Requested-With'],
      maxAge: 86400, // 24 hours
      optionsSuccessStatus: 204
    }));

    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    this.app.use(
      cookieSession({
        name: "session",
        keys: [this.appConfig.sessionKey],
        maxAge: this.appConfig.sessionMaxAge,
        secure: false,
        httpOnly: true
      })
    );

    const uploadsDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    this.app.use("/uploads", express.static(uploadsDir));

    dataSource.setOptions({
      extra: {
        // Increase lock timeout (default is 50 seconds)
        innodb_lock_wait_timeout: 180,
        // Add connection retry strategy
        connectionLimit: 10,
        acquireTimeout: 60000, // 60 seconds
        waitForConnections: true,
        queueLimit: 0,
      },
    });

    this.app.use("/api/auth", AuthRouter);
    this.app.use("/api/department", DepartmentRouter);
    this.app.use("/api/contract_attachment", ContractAttachmentRouter);
    this.app.use("/api/user_signature", UserSignatureRouter);
    this.app.use("/api/user", UserRouter);
    this.app.use("/api/contract", ContractRouter);
    this.app.use("/api/contract_signature", ContractSignatureRouter);
    this.app.use("/api/approval_flow", ApprovalFlowRouter);
    this.app.use("/api/notifications", notificationRouter);
  }

  private listen(): void {
    this.app.listen(this.appConfig.port, () => {
      console.log(`server started at http://localhost:${this.appConfig.port}`);
    });
  }
}

// tslint:disable-next-line:no-unused-expression
new App();
