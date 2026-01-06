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

// Add transaction support
db.begin = async (callback) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Create a tagged-template function that uses this client
    const t = async (strings, ...values) => {
      let text = "";
      const params = [];

      for (let i = 0; i < strings.length; i++) {
        text += strings[i];
        if (i < values.length) {
          if (values[i] && typeof values[i] === "object" && values[i].__raw) {
            text += values[i].sql;
          } else {
            params.push(values[i]);
            text += `$${params.length}`;
          }
        }
      }

      const res = await client.query(text, params);
      return res.rows;
    };

    // Execute the transaction callback
    const result = await callback(t);

    // Commit the transaction
    await client.query("COMMIT");

    return result;
  } catch (error) {
    // Rollback on error
    await client.query("ROLLBACK");
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
};

// Expose raw query and pool for code that expects them
db.query = (text, params) => pool.query(text, params);
db.pool = pool;

export default db;
