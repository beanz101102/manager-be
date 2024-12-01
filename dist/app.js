"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_session_1 = __importDefault(require("cookie-session"));
const path_1 = __importDefault(require("path"));
const data_source_1 = __importDefault(require("./database/data-source"));
const app_config_1 = __importDefault(require("./config/app.config"));
const auth_router_1 = __importDefault(require("./routers/auth.router"));
const user_router_1 = __importDefault(require("./routers/user.router"));
const contract_router_1 = __importDefault(require("./routers/contract.router"));
// import AuthMiddleware from "./middlewares/auth.middlewares";
const department_router_1 = __importDefault(require("./routers/department.router"));
const contractAttachment_router_1 = __importDefault(require("./routers/contractAttachment.router"));
const fs_1 = __importDefault(require("fs"));
const userSignature_router_1 = __importDefault(require("./routers/userSignature.router"));
const contractSignature_router_1 = __importDefault(require("./routers/contractSignature.router"));
const approvalFlow_router_1 = __importDefault(require("./routers/approvalFlow.router"));
const notification_router_1 = __importDefault(require("./routers/notification.router"));
class App {
    constructor() {
        this.app = (0, express_1.default)();
        this.appConfig = new app_config_1.default();
        this.bootstrap();
    }
    bootstrap() {
        this.setupMiddlewares();
        // this.serveStaticFiles();
        this.listen();
    }
    // Static  files
    /* private serveStaticFiles(): void {
          this.app.use(express.static(path.join(__dirname, 'FileName'), { maxAge:  this.appConfig.expiredStaticFiles}));
      } */
    setupMiddlewares() {
        this.app.use(express_1.default.json());
        this.app.use(express_1.default.urlencoded({ extended: true }));
        const allowedOrigins = [
            "http://localhost:3000",
            "http://localhost:5173",
            "https://contract-manager-five.vercel.app",
        ];
        const corsOptions = {
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                }
                else {
                    console.log(`Blocked request from unauthorized domain: ${origin}`);
                    callback(new Error("Not allowed by CORS"));
                }
            },
            credentials: true,
            methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
            allowedHeaders: [
                "Content-Type",
                "Authorization",
                "X-Requested-With",
                "Origin",
                "Accept",
                "Accept-Language",
                "Content-Language",
                "Access-Control-Allow-Headers",
                "Access-Control-Allow-Origin",
                "Access-Control-Allow-Credentials",
                "Access-Control-Allow-Methods",
                "X-Auth-Token",
            ],
            exposedHeaders: [
                "Access-Control-Allow-Origin",
                "Access-Control-Allow-Credentials",
            ],
            maxAge: 86400,
        };
        this.app.use((0, cors_1.default)(corsOptions));
        this.app.use((0, cookie_session_1.default)({
            name: "session",
            keys: [this.appConfig.sessionKey],
            maxAge: this.appConfig.sessionMaxAge,
            secure: false,
            sameSite: "lax",
        }));
        const uploadsDir = path_1.default.join(__dirname, "../uploads");
        if (!fs_1.default.existsSync(uploadsDir)) {
            fs_1.default.mkdirSync(uploadsDir, { recursive: true });
        }
        this.app.use("/uploads", express_1.default.static(uploadsDir));
        data_source_1.default.setOptions({
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
        this.app.use("/api/auth", auth_router_1.default);
        this.app.use("/api/department", department_router_1.default);
        this.app.use("/api/contract_attachment", contractAttachment_router_1.default);
        this.app.use("/api/user_signature", userSignature_router_1.default);
        this.app.use("/api/user", user_router_1.default);
        this.app.use("/api/contract", contract_router_1.default);
        this.app.use("/api/contract_signature", contractSignature_router_1.default);
        this.app.use("/api/approval_flow", approvalFlow_router_1.default);
        this.app.use("/api/notifications", notification_router_1.default);
    }
    listen() {
        this.app.listen(this.appConfig.port, () => {
            console.log(`server started at http://localhost:${this.appConfig.port}`);
        });
    }
}
// tslint:disable-next-line:no-unused-expression
new App();
//# sourceMappingURL=app.js.map