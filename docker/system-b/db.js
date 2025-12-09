import mysql from "mysql2/promise";

const db = await mysql.createPool({
    host: "db-b",
    user: "user",
    password: "pass",
    database: "system_b",
    waitForConnections: true,
    connectionLimit: 10,
});

export default db;
