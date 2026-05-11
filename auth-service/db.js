const { Pool } = require("pg");

const pool = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || "auth_db",
  user:     process.env.DB_USER     || "postgres",
  password: process.env.DB_PASSWORD || "",
});

pool.connect((err) => {
  if (err) {
    console.error("Auth DB connection error:", err.message);
  } else {
    console.log("Auth Service connected to PostgreSQL");
  }
});

module.exports = pool;
