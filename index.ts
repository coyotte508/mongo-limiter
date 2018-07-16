import * as mongoose from "mongoose";
import actionSchema, { ActionLogDocument } from "./src/schema";
import MongoLimiterError from "./src/mongo-limiter-error";

type UserActions = mongoose.Model<ActionLogDocument>;

export interface Limit {
  /** Maximum number of times the action can be done */
  limit: number;
  /** Duration in seconds of the period for which the limit is effective */
  duration: number;
}

export interface Limits {
  [action: string]: Limit;
}

class MongoLimiter {
  private UserActions: UserActions = null;
  public limits: Limits = {};

  public init(connection: mongoose.Connection, limits?: Limits) {
    this.UserActions = connection.model('UserActions', actionSchema);

    if (limits) {
      this.setLimits(limits);
    }
  }

  private checkInit() {
    if (!this.UserActions) {
      throw new MongoLimiterError("You must initialize mongo-limiter with a mongoose connection");
    }
  }

  public setLimits(limits: Limits) {
    this.limits = limits;
  }

  /**
   * Remaining number of times the user can do the action without going over the limit
   *
   * @param user The user identifier (id, username, ip)
   * @param action The action we're querying about
   */
  public async remainingUses(user: string, action: string) {
    await this.checkInit();

    if (!(action in this.limits)) {
      return Infinity;
    }

    const {duration, limit} = this.limits[action];

    const count = await this.UserActions.count({user, action, createdAt: {$gt: Date.now() - duration * 1000}}).limit(limit);
    return limit - count;
  }

  public async possible(user: string, action: string) {
    return (await this.remainingUses(user, action)) > 0;
  }

  /**
   * Tells MongoLimiter that user did action.
   *
   * @param user The user identifier (id, username, ip)
   * @param action The action done by the user
   * @param data Optional. The data to be logged with the action
   */
  public async action(user: string, action: string, data?: any) {
    await this.checkInit();

    return new this.UserActions({user, action, data}).save();
  }

  /**
   * Checks if the user can do the action, and if so, logs the action
   *
   * @param user
   * @param action
   * @param data
   *
   * @returns An object with the remaining number of times user can do the action, or
   *  false if the action can't be done
   */
  public async attempt(user: string, action: string, data?: any) {
    const remaining = await this.remainingUses(user, action);

    if (remaining <= 0) {
      return false;
    }

    await this.action(user, action, data);

    return {
      user,
      action,
      remaining: remaining - 1
    };
  }

  /**
   * Show the logs for the specified action/user/both
   *
   * @param options options.limit is the maximum number of entries, 50 by default
   */
  public async logs(options: {user?: string, action?: string, limit: number}) {
    const search: {user?: string, action?: string} = {};
    const limit = "limit" in options ? options.limit : 50;
    if (options.user) {
      search.user = options.user;
    }
    if (options.action) {
      search.action = options.action;
    }
    return await this.UserActions.find(search).sort({$natural: -1}).limit(limit);
  }
}

export default new MongoLimiter();
export {MongoLimiterError, ActionLogDocument};
