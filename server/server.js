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

// app.use(
//   cors({
//     origin: [
//       "http://localhost:5173",
//       "http://localhost:5174",
//       "http://localhost:5175",
//       "http://10.208.71.214:5173",
//       "https://unpayable-nonradically-felisha.ngrok-free.dev",
//     ], // your frontend URLs
//     credentials: true, // allow cookies/auth headers
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   })
// );
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
// const allowedOrigins = [
//   "http://localhost:5173",
//   "http://localhost:5174",
//   "http://localhost:5175",
//   "http://10.208.71.214:5173",
//   "https://unpayable-nonradically-felisha.ngrok-free.dev",
// ];

// app.use(
//   cors({
//     origin(origin, callback) {
//       if (!origin || allowedOrigins.includes(origin)) {
//         callback(null, true);
//       } else {
//         callback(new Error("Not allowed by CORS"));
//       }
//     },
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   })
// );

// Security headers for Google OAuth
app.use((req, res, next) => {
   res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
  res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
  next();
});

// no app.options(...) at all
app.use(bodyParser.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/auth", authRoute);
app.use("/contact", ContactRoute);
app.use("/", googleAuthRoute);
app.listen(process.env.PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});

// User Login → LoginAuth.js → Creates JWT → Sets HTTP Cookie →
// AuthStore updates → PrivateRoutes allows access → Applayout renders →
// Every request uses axios → Sends cookies → AuthMiddleware verifies →
// Protected routes accessible
