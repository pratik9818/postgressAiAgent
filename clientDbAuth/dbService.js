// import crypto from "crypto";
// import dotenv from "dotenv";
// dotenv.config();
// import DbModel from "./dbModal.js";
// import {appLogger} from "../logger/pino.js";
// import { Pool } from "pg";
// import Redis from "ioredis";
// class ClientDatabase {
//   static maxPools = 50;
//   static connectionPools = new Map();
//   static instance;
//   constructor() {
//     if (ClientDatabase.instance) {
//       return ClientDatabase.instance; // ✅ return existing instance
//     }
//     this.dbModal = new DbModel();
//     this.algorithm = '';
//     this.encryptKey = '';
//     this.IV_LENGTH = 16;
//     ClientDatabase.instance = this;
//     this.redis = new Redis({
//       host: 'localhost',
//       port: 6379,
//     });
//   }
//   async saveDBCredentials(req, res, next) {
//     try {
//       const userDbCredentials = req.body;
//       const userId = req.userId;
//       appLogger.info(userId, 'userId');
//       console.log(ClientDatabase.connectionPools);
//       console.log(ClientDatabase.connectionPools.get(userId));
      
//       ClientDatabase.connectionPools.delete(userId)
//       if(ClientDatabase.connectionPools.has(userId)){
//         const pool = ClientDatabase.connectionPools.get(userId)
//         await pool.end();
//         console.log('removed');
        
//         appLogger.info(`Removed connection pool for user ${userId} due to update in db credentials`);
//       }
      
//       const encryptedDBCredentials = this.encryptDBCredentials(userDbCredentials);
//       const savedDBCredentials = await this.dbModal.saveDBCredentials(
//         encryptedDBCredentials,
//         userId
//       );
//       appLogger.info(savedDBCredentials);
      
//       res.status(200).json({ message: "DB credentials saved successfully" });
//     } catch (error) {
//       appLogger.error(error);
//       next(error);
//     }
//   }

//   encryptDBCredentials(userDbCredentials) {
//     // Convert object to JSON string for encryption
//     const dataToEncrypt = JSON.stringify(userDbCredentials);

//     // Ensure the key is the correct length for AES-GCM (32 bytes for AES-256)
//     const key = crypto.scryptSync(this.encryptKey , "salt", 32);

//     const iv = crypto.randomBytes(this.IV_LENGTH);
//     const cipher = crypto.createCipheriv(
//       this.algorithm ,
//       key,
//       iv
//     );

//     let encrypted = cipher.update(dataToEncrypt, "utf8", "hex");
//     encrypted += cipher.final("hex");

//     const tag = cipher.getAuthTag().toString("hex");

//     // return IV + TAG + ENCRYPTED
//     return iv.toString("hex") + ":" + tag + ":" + encrypted;
//   }

//   decryptDBCredentials(enc) {
//     const [ivHex, tagHex, encrypted] = enc.split(":");

//     const iv = Buffer.from(ivHex, "hex");
//     const tag = Buffer.from(tagHex, "hex");

//     // Ensure the key is the correct length for AES-GCM (32 bytes for AES-256)
//     const key = crypto.scryptSync(this.encryptKey, "salt", 32);

//     const decipher = crypto.createDecipheriv(
//       this.algorithm ,
//       key,
//       iv
//     );
//     decipher.setAuthTag(tag);

//     let decrypted = decipher.update(encrypted, "hex", "utf8");
//     decrypted += decipher.final("utf8");

//     // Parse the JSON string back to object
//     return JSON.parse(decrypted);
//   }

//   async getDBCredentials(req, res, next) {
//     try {
//       const userId = req.userId;
//       appLogger.info(userId, 'userId');
//       const response = await this.dbModal.getDBCredentials(userId);
//       appLogger.info(response);
//       const decryptedCredentials = this.decryptDBCredentials(
//         response.dbCredentials
//       );
//       appLogger.info('decrypt DB Credentials');
//       res
//         .status(200)
//         .json({
//           message: "DB credentials fetched successfully",
//           decryptedCredentials,
//         });
//     } catch (error) {
//       appLogger.error(error);
//       next(error);
//     }
//   }
//   async deleteDBCredentials(req, res, next) {
//     try {
//       const userId = req.userId;
//       appLogger.info(userId, 'userId');
//       const response = await this.dbModal.deleteDBCredentials(userId);
//       if(ClientDatabase.connectionPools.has(userId)){
//         const pool = ClientDatabase.connectionPools.get(userId)
//         await pool.end();
//         ClientDatabase.connectionPools.delete(userId)
//         appLogger.info(`Removed connection pool for user ${userId} due to delete in db credentials`);
//       }
//       appLogger.info(response);
//       res.status(200).json({ message: "DB credentials deleted successfully" });
//     } catch (error) {
//       appLogger.error(error);
//       next(error);
//     }
//   }

//   async createConnection(userid) {
//     try {
//       const userId = userid;
      
//       appLogger.info(userId, 'userId');
//       const response = await this.dbModal.getDBCredentials(userId);
//       appLogger.info(response);      
//       const decryptedCredentials = this.decryptDBCredentials(
//         response.dbCredentials
//       );
//       appLogger.info('decrypt DB Credentials'); 
//       console.log(ClientDatabase.connectionPools);
      
//     // Check if we already have a pool for this user
//     if (ClientDatabase.connectionPools.has(userId)) {
//       return ClientDatabase.connectionPools.get(userId);
//     }

//     // If we've reached the maximum number of pools, remove the oldest one
//     if (ClientDatabase.connectionPools.size >= ClientDatabase.maxPools) {
//       const firstKey = ClientDatabase.connectionPools.keys().next().value;
//         const oldPool = ClientDatabase.connectionPools.get(firstKey);
//       await oldPool.end();
//       ClientDatabase.connectionPools.delete(firstKey);
//       appLogger.info(`Removed connection pool for user ${firstKey} due to limit`);
//     }

//     // Create new pool for this user

    
//     const pool = new Pool({
//       user: decryptedCredentials.user,
//       host: decryptedCredentials.host,
//       database: decryptedCredentials.database,
//       password: decryptedCredentials.password,
//       port: decryptedCredentials.port,
//       max:1
//     });
//     // console.log(pool);
    
//     // Cache the pool for future use
//     ClientDatabase.connectionPools.set(userId, pool);

//     return ClientDatabase.connectionPools.get(userId);
//   } catch (error) {
//       appLogger.error(error);
//     throw new Error(`Failed to create database connection: ${error.message}`);
//   }
//   }

//   // Method to clean up pools when needed
//   async cleanupPools() {
//     for (const [userId, pool] of ClientDatabase.connectionPools) {
//       await pool.end();
//     }
//     ClientDatabase.connectionPools.clear();
//   }
// }

// export default ClientDatabase;


import crypto from "crypto";
import DbModel from "./dbModal.js";
import { appLogger } from "../logger/pino.js";
import Redis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

class ClientDatabase {
  static instance;

  constructor() {
    if (ClientDatabase.instance) return ClientDatabase.instance;

    this.dbModal = new DbModel();
    this.algorithm = process.env.ALGORITHM;
    this.encryptKey = process.env.ENCRYPT_KEY
    this.IV_LENGTH = 16;

    // Redis client for coordination
    this.redis = new Redis({ host: "localhost", port: 6379 });

    ClientDatabase.instance = this;
  }

  // ------------------ Encryption ------------------
  encryptDBCredentials(userDbCredentials) {
    const dataToEncrypt = JSON.stringify(userDbCredentials);
    const key = crypto.scryptSync(this.encryptKey, "salt", 32);
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let encrypted = cipher.update(dataToEncrypt, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag().toString("hex");

    return iv.toString("hex") + ":" + tag + ":" + encrypted;
  }

  decryptDBCredentials(enc) {
    const [ivHex, tagHex, encrypted] = enc.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const key = crypto.scryptSync(this.encryptKey, "salt", 32);
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return JSON.parse(decrypted);
  }

  // ------------------ Credential Handling ------------------
  async saveDBCredentials(req, res, next) {
    try {
      const userId = req.userId;
      const encrypted = this.encryptDBCredentials(req.body);
      await this.dbModal.saveDBCredentials(encrypted, userId);

      // Notify all processes that credentials have changed
      await this.redis.publish("dbCredentialsUpdate", userId);

      res.status(200).json({ message: "DB credentials saved successfully" });
    } catch (err) {
      appLogger.error(err);
      next(err);
    }
  }

  async getDBCredentials(req, res, next) {
    try {
      const userId = req.userId;
      const response = await this.dbModal.getDBCredentials(userId);
      const decrypted = this.decryptDBCredentials(response.dbCredentials);
      res.status(200).json({
        message: "DB credentials fetched successfully",
        decryptedCredentials: decrypted,
      });
    } catch (err) {
      appLogger.error(err);
      next(err);
    }
  }

  async deleteDBCredentials(req, res, next) {
    try {
      const userId = req.userId;
      await this.dbModal.deleteDBCredentials(userId);

      // Remove pool locally and notify workers
      await this.deleteUserPool(userId);
      await this.redis.publish("dbCredentialsUpdate", userId);

      res.status(200).json({ message: "DB credentials deleted successfully" });
    } catch (err) {
      appLogger.error(err);
      next(err);
    }
  }
}

export default ClientDatabase;
