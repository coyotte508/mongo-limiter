const co = require("co");

module.exports = (function() {
  var limits = {};

  var setLimits = (newLimits) => {
    limits = newLimits;
  }

  var isPossible = (user, action) => {

  };

  var addAction = (user, action, data) => {

  };

  var attempt = (user, action, data) => {
    return co(function*() {
      var canDo = yield isPossible(user, action);

      if (!canDo) {
        return new Error(`Limit for ${user} to ${action} reached`);
      }

      return yield addAction(user, action, data);
    });
  }

  var getLogs = (options) {

  };

  return {setLimits, possible: isPossible, action: addAction, attempt};
})();