// const {OAuth2Client} = require('google-auth-library');
import dotenv from "dotenv";
import { AppError } from "../../utils/error.js";
import { OAuth2Client } from "google-auth-library";
import { authLogger } from "../../logger/pino.js";
dotenv.config();
const client = new OAuth2Client();
const clientId = process.env.GOOGLE_CLIENT;

const verifygoogleToken = async (req, res, next) => {
  const googleToken = req?.body.token;
  authLogger.info(googleToken, "googleToken");
  if (!googleToken)
    throw new AppError({ status: 400, message: "google token absent" });
  try {
    const res = await client.verifyIdToken({
      idToken: googleToken,
      audience: clientId,
    });
    const { email, name } = res.getPayload();

    req.email = email;
    req.username = name;
    next();
  } catch (error) {
    authLogger.error(error, "error in verifygoogleToken");

    next({
      status: 500,
      message: "google token verification failed ! please try again .",
    });
  }
};
export default verifygoogleToken;
