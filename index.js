const actionSchema = require("./schema.js");

module.exports = function(connection) {
  const UserActions = connection.model('UserActions', actionSchema);
  var limits = {};

  var setLimits = (newLimits) => {
    limits = newLimits;
  }

  var isPossible = (user, action) => {
    if (! (action in limits)) {
      return Promise.resolve(true);
    }

    var max = limits[action].limit;
    var duration = limits[action].duration;

    return UserActions.count({user, action, $gt: {createdAt: Date.now() - duration*1000}}, {limit: max}).then(count => count < max);
  };

  var addAction = (user, action, data) => {
    var act = new UserActions();
    [act.user, act.action, act.data] = [user, action, data];
    return act.save();
  };

  var attempt = (user, action, data) => {
    return isPossible(user, action).then(
      canDo => canDo ? addAction(user, action, data) : new Error(`Limit for ${user} to ${action} reached`));
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
    return UserActions.find(search).limit(limit);
  };

  return {setLimits, possible: isPossible, action: addAction, attempt};
};