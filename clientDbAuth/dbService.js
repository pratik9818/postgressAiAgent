import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();
import DbModel from "./dbModal.js";
import {appLogger} from "../logger/pino.js";
import { Pool } from "pg";
class ClientDatabase {
  static maxPools = 50;
  static connectionPools = new Map();
  constructor() {
    this.dbModal = new DbModel();
    this.algorithm = 'aes-256-gcm';
    this.encryptKey = 'c26695908d8321be61fbc657e90b19f0813eba48fac7f6148a246cbebf27d99a';
    this.IV_LENGTH = 16;
  }
  async saveDBCredentials(req, res, next) {
    try {
      const userDbCredentials = req.body;
      const userId = req.userId;
      appLogger.info(userId, 'userId');
      const encryptedDBCredentials = this.encryptDBCredentials(userDbCredentials);
      const savedDBCredentials = await this.dbModal.saveDBCredentials(
        encryptedDBCredentials,
        userId
      );
      appLogger.info(savedDBCredentials);

      res.status(200).json({ message: "DB credentials saved successfully" });
    } catch (error) {
      appLogger.error(error);
      next(error);
    }
  }

  encryptDBCredentials(userDbCredentials) {
    // Convert object to JSON string for encryption
    const dataToEncrypt = JSON.stringify(userDbCredentials);

    // Ensure the key is the correct length for AES-GCM (32 bytes for AES-256)
    const key = crypto.scryptSync(this.encryptKey , "salt", 32);

    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(
      this.algorithm ,
      key,
      iv
    );

    let encrypted = cipher.update(dataToEncrypt, "utf8", "hex");
    encrypted += cipher.final("hex");

    const tag = cipher.getAuthTag().toString("hex");

    // return IV + TAG + ENCRYPTED
    return iv.toString("hex") + ":" + tag + ":" + encrypted;
  }

  decryptDBCredentials(enc) {
    const [ivHex, tagHex, encrypted] = enc.split(":");

    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");

    // Ensure the key is the correct length for AES-GCM (32 bytes for AES-256)
    const key = crypto.scryptSync(this.encryptKey, "salt", 32);

    const decipher = crypto.createDecipheriv(
      this.algorithm ,
      key,
      iv
    );
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    // Parse the JSON string back to object
    return JSON.parse(decrypted);
  }

  async getDBCredentials(req, res, next) {
    try {
      const userId = req.userId;
      appLogger.info(userId, 'userId');
      const response = await this.dbModal.getDBCredentials(userId);
      appLogger.info(response);
      const decryptedCredentials = this.decryptDBCredentials(
        response.dbCredentials
      );
      appLogger.info('decrypt DB Credentials');
      res
        .status(200)
        .json({
          message: "DB credentials fetched successfully",
          decryptedCredentials,
        });
    } catch (error) {
      appLogger.error(error);
      next(error);
    }
  }
  async deleteDBCredentials(req, res, next) {
    try {
      const userId = req.userId;
      appLogger.info(userId, 'userId');
      const response = await this.dbModal.deleteDBCredentials(userId);
      appLogger.info(response);
      res.status(200).json({ message: "DB credentials deleted successfully" });
    } catch (error) {
      appLogger.error(error);
      next(error);
    }
  }

  async createConnection(userid) {
    try {
      const userId = userid;
      appLogger.info(userId, 'userId');
      const response = await this.dbModal.getDBCredentials(userId);
      appLogger.info(response);      
      const decryptedCredentials = this.decryptDBCredentials(
        response.dbCredentials
      );
      appLogger.info('decrypt DB Credentials'); 
    // Check if we already have a pool for this user
    if (ClientDatabase.connectionPools.has(userId)) {
      return ClientDatabase.connectionPools.get(userId);
    }

    // If we've reached the maximum number of pools, remove the oldest one
    if (ClientDatabase.connectionPools.size >= ClientDatabase.maxPools) {
      const firstKey = ClientDatabase.connectionPools.keys().next().value;
        const oldPool = ClientDatabase.connectionPools.get(firstKey);
      await oldPool.end();
      ClientDatabase.connectionPools.delete(firstKey);
      appLogger.info(`Removed connection pool for user ${firstKey} due to limit`);
    }

    // Create new pool for this user
    const pool = new Pool({
      user: decryptedCredentials.user,
      host: decryptedCredentials.host,
      database: decryptedCredentials.database,
      password: decryptedCredentials.password,
      port: decryptedCredentials.port,
    });
    // console.log(pool);
    
    // Cache the pool for future use
    ClientDatabase.connectionPools.set(userId, pool);

    return ClientDatabase.connectionPools.get(userId);
  } catch (error) {
      appLogger.error(error);
    throw new Error(`Failed to create database connection: ${error.message}`);
  }
  }

  // Method to clean up pools when needed
  async cleanupPools() {
    for (const [userId, pool] of ClientDatabase.connectionPools) {
      await pool.end();
    }
    ClientDatabase.connectionPools.clear();
  }
}

export default ClientDatabase;
