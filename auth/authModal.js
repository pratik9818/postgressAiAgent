import { AppError } from '../utils/error.js';
import database from '../database/db.js';
import { authLogger } from '../logger/pino.js';
import { ObjectId } from 'mongodb';
class AuthModal {
    constructor() {
        // Remove immediate database access - make it lazy
    }

    // Helper method to get the users collection
    getUsersCollection() {
        return database.getDatabase().collection('users');
    }

    /**
     * Find user by email
     * @returns {Promise<Object|null>} User object or null if not found
     */
    async findUserByUserid(userId) {
        try {
            const usersCollection = this.getUsersCollection();
            
            const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
            
            return user;
        } catch (error) {
            authLogger.error('Error finding user by userid:', error);
            throw new AppError({ status: 500, message: 'Database error while finding user' });
        }
    }
    async findUserByEmail(email) {
        try {
            const usersCollection = this.getUsersCollection();
            
            const user = await usersCollection.findOne({ email });
            
            return user;
        } catch (error) {
            authLogger.error('Error finding user by email:', error);
            throw new AppError({ status: 500, message: 'Database error while finding user' });
        }
    }
    async addSubscription(userid){
        try {
            await database.collection('subscription').insertOne({
                userid,
                tokenUsage: 0,
                created_at: new Date(),
                updated_at: new Date(),
                subscription_type: 'free'
            })
        } catch (error) {
            authLogger.error('Error adding subscription:', error);
            throw new AppError({ status: 500, message: 'Database error while adding subscription' });
        }
    }
    /**
     * Create new user
     * @param {string} email - User's email
     * @param {string} username - User's name
     * @param {string} googleId - Google ID
     * @returns {Promise<Object>} Created user object
     */
    async createUser(email, username, googleId = null) {
        try {
            const usersCollection = this.getUsersCollection();
            const userData = {
                email,
                username,
                google_id: googleId,
                last_login: new Date(),
                created_at: new Date(),
                updated_at: new Date()
            };
            
            const result = await usersCollection.insertOne(userData);
            await this.addSubscription(result.insertedId);
            return { ...userData, _id: result.insertedId };
        } catch (error) {
            authLogger.error('Error creating user:', error);
            throw new AppError({ status: 500, message: 'Database error while creating user' });
        }
    }

    /**
     * Update user's last login
     * @returns {Promise<Object>} Updated user object
     */
    async updateLastLogin(email) {
        try {
            const usersCollection = this.getUsersCollection();
            const result = await usersCollection.findOneAndUpdate(
                { email },
                { 
                    $set: { 
                        last_login: new Date(),
                        updated_at: new Date()
                    }
                },
                { returnDocument: 'after' }
            );
            return result.value;
        } catch (error) {
            authLogger.error('Error updating last login:', error);
            throw new AppError({ status: 500, message: 'Database error while updating last login' });
        }
    }

    /**
     * Find or create user (upsert operation)
     * @param {string} email - User's email
     * @param {string} username - User's name
     * @param {string} googleId - Google ID
     * @returns {Promise<Object>} User object
     */
    async findOrCreateUser(email, username, googleId = null) {
        try {
            let user = await this.findUserByEmail(email);
            
            if (!user) {
                user = await this.createUser(email, username, googleId);
            } 
            else {
                // Update last login for existing user
                await this.updateLastLogin(email);
            }
            // console.log(user,'user2');
            return user;
        } catch (error) {
            authLogger.error('Error in findOrCreateUser:', error);
            throw new AppError({ status: 500, message: 'Database error while finding or creating user' });
        }
    }
}

export default AuthModal;
