# sails-coouchdb-orm

## Install

Add this module to your sails.js project:

```bash
$ npm install sails-coouchdb-orm --save
```

## Use

### Authenticate

Authenticate against the CouchDB user database (`_users`).

Example:

```javascript
var username = req.param('username');
var password = req.param('password');

Users.authenticate(username, password, function(err, sessionId, username, roles) {
  // ...
});