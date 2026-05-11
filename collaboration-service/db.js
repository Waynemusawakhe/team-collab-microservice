const { Pool } = require("pg");

const pool = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || "collab_db",
  user:     process.env.DB_USER     || "postgres",
  password: process.env.DB_PASSWORD || "",
});

pool.connect((err) => {
  if (err) {
    console.error("Collab DB connection error:", err.message);
  } else {
    console.log("Collaboration Service connected to PostgreSQL");
  }
});

module.exports = pool;
