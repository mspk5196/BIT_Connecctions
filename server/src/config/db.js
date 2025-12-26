import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const db = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
});

db.on("error", (err) => {
  console.error("Unexpected PostgreSQL client error:", err.stack || err);
});

export default db;