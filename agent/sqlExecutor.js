import ClientDatabase from "../clientDbAuth/dbService.js";
import SQLValidator from "./utils/SqlValidator.js";
import { workerLogger } from "../logger/pino.js";
class SQLExecutor {
  constructor() {
    this.clientDatabase = new ClientDatabase();
    this.sqlValidator = new SQLValidator();
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
      const db = await this.clientDatabase.createConnection(userId);

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
      const db = await this.clientDatabase.createConnection(userId);

      if (!db) {
        workerLogger.error("Failed to create client database connection");
        throw new Error("Failed to create database connection");
      }
      const res = await db.query(this.schemaQuery());
      return JSON.stringify(res.rows);
      
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
}

export default SQLExecutor;
