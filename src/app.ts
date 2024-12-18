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

    // Danh sách các domain được phép truy cập
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://contract-manager-five.vercel.app",
    ];

    // Middleware kiểm tra origin trước khi cho phép truy cập
    this.app.use((req, res, next) => {
      console.log("Request Origin:", req.headers.origin);
      console.log("Request Method:", req.method);
      console.log("Request Path:", req.path);

      const origin = req.headers.origin;
      if (origin && allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader(
          "Access-Control-Allow-Methods",
          "GET,HEAD,PUT,PATCH,POST,DELETE"
        );
        res.setHeader(
          "Access-Control-Allow-Headers",
          [
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "Origin",
            "Accept",
          ].join(",")
        );
        console.log("CORS allowed for origin:", origin);
      } else {
        console.log("CORS blocked for origin:", origin);
      }

      // Handle preflight requests
      if (req.method === "OPTIONS") {
        return res.sendStatus(204);
      }
      next();
    });

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
  }

  private listen(): void {
    this.app.listen(this.appConfig.port, () => {
      console.log(`server started at http://localhost:${this.appConfig.port}`);
    });
  }
}

// tslint:disable-next-line:no-unused-expression
new App();
