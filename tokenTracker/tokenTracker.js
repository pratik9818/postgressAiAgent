import { CohereClient } from "cohere-ai";
import { cohereModal, subscriptionModal } from "../utils/constant.js";
import tokenModal from "./tokenModal.js";
import { workerLogger } from "../logger/pino.js";

class TokenTracker {
  constructor() {
    this.llmModal = new CohereClient({
      // it is intializeing again and agian , has to add singleton pattern !
      token: "OFdL2T9rZeenNeQkVItIoowM66YY429w0NISqIaf",
    });
    this.tokenModal = new tokenModal();
    this.TokenUsed = 0;
    this.tokenLimit = 0;
    this.tokenUsage_job = 0;
  }
  async track(userid, text, executionType, actualTokens) {
    //getUserTokenUsage
    // check for token exhaustation - handle error if token exhaust
    //convert text into token
    // track token
    //check context window
    //checkusertokenlimit usage
    //update the token in db - do not update if toke not use by llm

    //imp case - have to check input and output token of llm modal

    try {
      if (executionType == "beforeLLM") {
        const subcription = await this.getSubscriptionDetail(userid);
        if (subcription.subscription_type == "free") {
          this.TokenUsed = subcription.tokenUsage;
          this.tokenLimit = subscriptionModal.free.tokenLimit;
          if (subscriptionModal.free.tokenLimit < this.TokenUsed) {
            workerLogger.error("you reached your token limit");
            throw new Error("token limit");
          }
        }
        const tokens = await this.textToToken(text);
        this.tokenTracker(tokens);
        this.checkContextWindow(tokens);
      } else if (executionType == "afterLLM") {
        const res = await this.updateTokenInDb(
          userid,
          this.TokenUsed + actualTokens
        );
        workerLogger.info(res, "updaing token in db");
        this.tokenUsage_job = 0;
      }
    } catch (error) {
      workerLogger.error(error, "error in token tracker");
      throw new Error(error, "error in token tracker");
    }
  }

  async textToToken(text) {
    const response = await this.llmModal.tokenize({
      text,
      model: cohereModal.currentModal,
    });
    workerLogger.info(response.tokens.length, "TOKEN LENGTH");
    return response.tokens.length;
  }
  checkContextWindow(token) {
    if (token > cohereModal.contextWindow) {
      workerLogger.error("context window exceeded");
      throw new Error("context window exceeded");
    } else {
      workerLogger.info("context window normal");
    }
  }
  async updateTokenInDb(userid, actualTokens) {
    try {
      const res = await this.tokenModal.updateTokenInDb(actualTokens, userid);
      return res;
    } catch (error) {
      workerLogger.error(error, "error in updateTokenInDb");
      throw new Error(error, "error in updateTokenInDb");
    }
  }
  tokenTracker(tokencount) {
    this.tokenUsage_job = this.tokenUsage_job + tokencount;
    workerLogger.info(this.tokenUsage_job, "tokenUsage_job");
  }
  async getSubscriptionDetail(userid) {
    try {
      const res = await this.tokenModal.getSubDetails(userid);
      workerLogger.info(res, "getSubscriptionDetail");
      return res;
    } catch (error) {
      workerLogger.error(error, "error in getSubscriptionDetail");
      throw new Error(error, "error in getSubscriptionDetail");
    }
  }
}

export default TokenTracker;
