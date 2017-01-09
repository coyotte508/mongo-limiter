# mongo-limiter
Rate limiter and logger for actions by users or ips using mongoose

Create a **mongoose** collection with actions (expirable).

User actions can be logged (post-chapter, comment, delete-comment, edit, create-account, ...). Each action is stored in a 24 hours table, expiring after that. Rate limits can be set, the module implementing them following a leaky bucket model.

## Usage

```js
const mongoose = require('mongoose');
const limiter = require('mongo-limiter');
const router = require('express').Router();

/* Do once */
limiter.init(mongoose.connection);

limiter.setLimits({
   comment: {limit: 10, duration: 3600},
   post: {limit: 5, duration: 3600*24},
   edit: {limit: 20, duration: 3600}
});

/* Use case: authenticated user posts a comment on a website run with express / passport / mongoose.*/
router.post('/comment', (req, res, next) => {
  limiter.attempt(req.user.id, 'comment', req.body).then(
    (success) => {
      if (!success) {
        res.statusCode = 429;
        return res.json({error: "You can only post 10 comments per hour"});
      }
      /* Success! Post comment to database and return page */
      //success.remaining contains the remaining number of authorized actions
    }, err => next(err)); { /* Probably a mongoose error */
});

/* Use case: show 20 last actions done by user in the last 24 hour */
router.get('/logs', (req, res, next) => {
  limiter.logs({user: req.user.id, limit: 20}).then(
    (actions) => {
      res.json(actions);
    }, err => next(err));
});
```

Due to their unique string representations, variables of type `ObjectId` can be used as values for the `user` argument.

## API

All the functions except for getting and setting the parameters return Promises.

### .init(connection: mongoose.connection)

Initialize the connection to the mongo database, needed before any calls to the other functions.

### .setLimits(limits: {action: {duration: Number, limit: Number}})

Set the limits. Example:

```js
limiter.setLimits({
   comment: {limit: 10, duration: 3600},
   post: {limit: 5, duration: 3600*24},
   edit: {limit: 20, duration: 3600}
});
```

### .limits()

Get the limits previously set.

### .attempt(user: String, action: String[, data])

Check if the given user is allowed to execute an action, returns `false` if not. If allowed, consider the action done and log it. `data` is added to the log of the action.

`user` can be an ip, an `ObjectId`, or any type with a proper string representation.

If `data` is considerable, like if it contains all of a long post's data, you may want to remove the long parts or just keep the title of the post.

Returned value: 

- `false` if the attempt failed
- `{remaining: Number}` The remaining number of times the user can do the action

**Changes in 0.1.0**: This function now returns `false` in case the attempt fails, instead of an error

### .possible(user, action)

Check if an action is possible and return true or false depending on it.

### .remaining(user, action)

Check if an action is possible and returns the number of times it can be executed. If the action is not specified in `limits`, returns `Infinity`. If the action is not possible anymore, returns `0` or a negative number.

### .action(user, action, data)

Consider an action done and log it, counting toward the limit set.

### .logs(options)

Return the logs for user actions in the last 24 hours, starting from the most recent. The following options can be used.

#### user (String)

If specifed, will only show the logs for the specified user. 

#### action (String)

If specified, will only show the logs for that specific action type

#### limit (default: 50)

The maximum number of records to show. Use `0` for no limit.

## MongoDb model

Model created:

``` js
// This module will create a Mongoose model 
// collection with schema:
UserActions = new mongoose.Schema({
    createdAt:     Date, //indexed, expires after 24 hours
    user:          String, //indexed
    action:        String,
    data:          Schema.Types.Mixed //optional
});
```
