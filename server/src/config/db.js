import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL client error:", err.stack || err);
});

// Tagged-template helper so existing controllers can use `db` as a template tag:
// const rows = await db`SELECT * FROM users WHERE id = ${id}`;
async function db(strings, ...values) {
  let text = "";
  const params = [];

  for (let i = 0; i < strings.length; i++) {
    text += strings[i];
    if (i < values.length) {
      // Check if this is an unsafe raw SQL fragment
      if (values[i] && typeof values[i] === "object" && values[i].__raw) {
        text += values[i].sql;
      } else {
        params.push(values[i]);
        text += `$${params.length}`;
      }
    }
  }

  const res = await pool.query(text, params);
  return res.rows;
}

// Add unsafe method for raw SQL fragments (use with caution!)
db.unsafe = (rawSQL) => {
  // Return a special marker object that tells the template function to insert raw SQL
  return { __raw: true, sql: rawSQL || "" };
};

// Expose raw query and pool for code that expects them
db.query = (text, params) => pool.query(text, params);
db.pool = pool;

export default db;
