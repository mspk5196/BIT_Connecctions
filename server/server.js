import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import authRoute from "./routes/LoginRoute.js";
import ContactRoute from "./routes/ContactsRoutes.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import {} from "./controllers/TaskControllers.js";
import googleAuthRoute from "./routes/GoogleAuthRoute.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import cookieParser from "cookie-parser";

const app = express();
dotenv.config();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://172.21.2.45:5173",
      "http://172.21.2.45:5174", 
      "http://172.21.2.45:5175",
      "https://0znv2w8j-5173.inc1.devtunnels.ms",
      "https://unpayable-nonradically-felisha.ngrok-free.dev",

    ], // your frontend URLs
    credentials: true, // allow cookies/auth headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(bodyParser.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/auth", authRoute);
app.use("/api", ContactRoute);
app.use("/auth", googleAuthRoute);
app.listen(8000,'0.0.0.0', () => {
  console.log("Server is running on port 8000");
});

// User Login → LoginAuth.js → Creates JWT → Sets HTTP Cookie → 
// AuthStore updates → PrivateRoutes allows access → Applayout renders → 
// Every request uses axios → Sends cookies → AuthMiddleware verifies → 
// Protected routes accessible