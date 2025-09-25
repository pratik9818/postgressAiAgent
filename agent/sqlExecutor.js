import ClientDatabase from "#clientDbAuth/dbService.js";
import SQLValidator from "./utils/SqlValidator.js";
import { workerLogger } from "../logger/pino.js";
import { Pool } from "pg";
import Redis from "ioredis";
import DbModel from "../clientDbAuth/dbModal.js";
class SQLExecutor {
  static maxPools = 50;
  constructor() {
    this.clientDatabase = new ClientDatabase();
    this.sqlValidator = new SQLValidator();
    this.localPools = new Map();
    this.redis = new Redis({ host: "localhost", port: 6379 });
    this.dbModal = new DbModel();
    // Subscribe to DB credentials updates
    this.redis.subscribe("dbCredentialsUpdate");
    this.redis.on("message", async (channel, userId) => {
      if (channel === "dbCredentialsUpdate") {
        workerLogger.info(
          `Received credentials update for user ${userId}, deleting local pool`
        );
        await this.deleteUserPool(userId);
      }
    });
  }
  async executionBrain(functionName, sqlQuery, userId) {
    const sql = JSON.parse(sqlQuery);
    workerLogger.info(sql, "sql");
    const sanitizedSql = this.sqlValidator.sanitizeSql(sql.query);
    const validationResult = this.sqlValidator.validateSqlQuery(sql.query);
    workerLogger.info(validationResult, "validationResult");
    if (!validationResult.isValid) {
      let err = this.sqlValidator.getValidationSummary(validationResult);
      workerLogger.info(err, "err");
      return { result:null , error :err };
    }

    if (functionName == "read_query") {
      return await this.readSql(sql, userId);
    }
  }

  async readSql(sql, userId) {
    try {
      const db = await this.createConnection(userId);

      if (!db) {
        workerLogger.error("Failed to create client database connection");
        throw new Error("Failed to create database connection");
      }

      const res = await db.query(sql.query);
      return {result:JSON.stringify(res.rows) , error :null}
    } catch (error) {
      workerLogger.error(error, "error");
      throw error; // Re-throw the error so it can be handled by the caller
    }
  }

  async getUserDbSchema(userId) {
    try {
      const db = await this.createConnection(userId);

      if (!db) {
        workerLogger.error("Failed to create client database connection");
        throw new Error("Failed to create database connection");
      }
      const tablesRes = await db.query(`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
      `);
  
      const samples = {};
  
      // Step 2: Loop over tables and get 1 row per table
      
  
      // return samples;
      const res = await db.query(this.schemaQuery());

      for (const { tablename } of tablesRes.rows) {
        try {
          const rowRes = await db.query(`SELECT * FROM ${tablename} LIMIT 1`);
          samples[tablename] = rowRes.rows[0] || null;
        } catch (err) {
          // Handle tables that may fail (e.g., permissions, empty)
          samples[tablename] = null;
          console.error(`Failed to fetch row from table ${tablename}:`, err.message);
        }
      }
      
      return {schema:JSON.stringify(res.rows), tableData:JSON.stringify(samples)}
      
    } catch (error) {      
      workerLogger.error(error, "error");
      throw error; // Re-throw the error so it can be handled by the caller
    }
  }

  schemaQuery() {
    return `SELECT 
    c.relname AS table_name,
    string_agg(a.attname || ' ' || pg_catalog.format_type(a.atttypid, a.atttypmod), ', ' ORDER BY a.attnum) AS columns
FROM pg_catalog.pg_attribute a
JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE a.attnum > 0
  AND NOT a.attisdropped
  AND n.nspname = 'public'
GROUP BY c.relname
ORDER BY c.relname;`;
  }

  

  // ------------------ Pool Management ------------------
  async createConnection(userId) {
    // 1️⃣ Check local cache first
    if (this.localPools.has(userId)) return this.localPools.get(userId);

    // 2️⃣ Fetch credentials from DB
    const response = await this.dbModal.getDBCredentials(userId);
    const creds = this.clientDatabase.decryptDBCredentials(response.dbCredentials);

    // 3️⃣ Create a new Pool
    const pool = new Pool({
      user: creds.user,
      host: creds.host,
      database: creds.database,
      password: creds.password,
      port: creds.port,
      max: 1, // adjust per user
    });

    // 4️⃣ Add to local cache
    this.localPools.set(userId, pool);


    // 6️⃣ Cleanup oldest pool if exceeding maxPools
    if (this.localPools.size > SQLExecutor.maxPools) {
      const oldestUserId = this.localPools.keys().next().value;
      await this.deleteUserPool(oldestUserId);
    }

    return pool;
  }

  async deleteUserPool(userId) {
    
    if (this.localPools.has(userId)) {
      const pool = this.localPools.get(userId);
      await pool.end();
      this.localPools.delete(userId);
      workerLogger.info(`Deleted pool for user ${userId}`);
    }
  }

  async cleanupPools() {
    for (const [userId, pool] of this.localPools) {
      await pool.end();
    }
    this.localPools.clear();
  }
}

export default SQLExecutor;
