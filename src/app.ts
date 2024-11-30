import express from "express";
import cors from "cors";
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
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // CORS configuration
    const allowedOrigins = [
        'https://contract-manager-five.vercel.app',
        'http://localhost:3000',     // React default port
        'http://localhost:3001',     // Để phòng trường hợp port khác
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001'
    ];

    this.app.use(cors({
        origin: function(origin, callback) {
            // allow requests with no origin (like mobile apps or curl requests)
            if(!origin) return callback(null, true);
            
            if(allowedOrigins.indexOf(origin) === -1){
                const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
                return callback(new Error(msg), false);
            }
            return callback(null, true);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept']
    }));

    this.app.use(
      cookieSession({
        name: "session",
        keys: [this.appConfig.sessionKey],
        maxAge: this.appConfig.sessionMaxAge,
        secure: false,
        sameSite: "lax",
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

    // Add router test
    this.app.get("/", (req, res) => {
        res.json({
            message: "Welcome to Contract Manager API",
            status: "running",
            timestamp: new Date().toISOString()
        });
    });
  }

  private listen(): void {
    this.app.listen(this.appConfig.port, '0.0.0.0', () => {
      console.log(`server started at http://0.0.0.0:${this.appConfig.port}`);
    });
  }
}

// tslint:disable-next-line:no-unused-expression
new App();
