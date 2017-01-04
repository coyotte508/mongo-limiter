const actionSchema = require("./schema.js");

module.exports = (function() {
  var UserActions = null;
  var limits = {};

  function MongoLimiterError(message, remaining) {
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = message;
    if (arguments.length >= 2) {
      this.remaining = remaining;
    }
  };

  require('util').inherits(MongoLimiterError, Error);

  var init = (connection, limits) => {
    UserActions = connection.model('UserActions', actionSchema);

    if (limits) {
      setLimits(limits);
    }
  }

  var checkInit = (fn) => function() {
    if (!UserActions) {
      throw new MongoLimiterError("You must initialize mongo-limiter with a mongoose connection");
    }

    return fn.apply(this, arguments);
  };

  var setLimits = (newLimits) => {
    limits = newLimits;
  };

  var getLimits = () => limits;

  var remaining = (user, action) => {
    if (! (action in limits)) {
      return Promise.resolve(Infinity);
    }

    var max = limits[action].limit;
    var duration = limits[action].duration;

    return UserActions.count({user, action, createdAt: {$gt: Date.now() - duration*1000}}).limit(max).then(count => max - count);
  }

  var isPossible = (user, action) => {
    return remaining(user, action).then(rem => rem > 0);
  };

  var addAction = (user, action, data) => {
    var act = new UserActions();
    //[act.user, act.action, act.data] = [user, action, data];
    act.user = user, act.action = action, act.data = data;
    return act.save();
  };

  var attempt = (user, action, data) => {
    return remaining(user, action).then(
      rem => {
        if (rem > 0) {
          /* Silence the return value of addAction */
          return addAction(user, action, data).then(() => {return {remaining: rem-1};});
        } 

        return false; //throw new MongoLimiterError(`Limit for ${user} to ${action} reached`, rem); 
      }
    );
  };

  var getLogs = (options) => {
    var search = {};
    var limit = "limit" in options ? options.limit : 50;
    if (options.user) {
      search.user = options.user;
    }
    if (options.action) {
      search.action = options.action;
    }
    return UserActions.find(search).sort({$natural:-1}).limit(limit);
  };

  return {
    init,
    setLimits, 
    limits: getLimits, 
    possible: checkInit(isPossible),
    remaining: checkInit(remaining), 
    action: checkInit(addAction), 
    attempt: checkInit(attempt),
    getLogs: checkInit(getLogs),
    MongoLimiterError
  };
}());