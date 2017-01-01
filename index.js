const actionSchema = require("./schema.js");

module.exports = function(connection) {
  const UserActions = connection.model('UserActions', actionSchema);
  var limits = {};

  var setLimits = (newLimits) => {
    limits = newLimits;
  }

  var getLimits = () => limits;

  var isPossible = (user, action) => {
    if (! (action in limits)) {
      return Promise.resolve(true);
    }

    var max = limits[action].limit;
    var duration = limits[action].duration;

    return UserActions.count({user, action, createdAt: {$gt: Date.now() - duration*1000}}).limit(max).then(count => count < max);
  };

  var addAction = (user, action, data) => {
    var act = new UserActions();
    //[act.user, act.action, act.data] = [user, action, data];
    act.user = user, act.action = action, act.data = data;
    return act.save();
  };

  var attempt = (user, action, data) => {
    return isPossible(user, action).then(
      canDo => {
        if (canDo) {
          /* Silence the return value of addAction */
          return addAction(user, action, data).then(() => null);
        } else {
          return new Error(`Limit for ${user} to ${action} reached`);
        }
      });
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

  return {setLimits, limits: getLimits, possible: isPossible, action: addAction, attempt};
};