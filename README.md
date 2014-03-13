# sails-coouchdb-orm

## Install

Add this module to your sails.js project:

```bash
$ npm install sails-coouchdb-orm --save
```

## Use

### Class methods

Besides the usual Waterline stuff, this adapter also provides the class methods `merge`, `authenticate` and `session`.


#### View

TODO docs


#### Merge

Merge some attributes into one document.

Example:

```javascript
var someAttributes = {
  lastName: 'Simpson',
  favoriteFood: 'beer'
};

var id = 'homer@simpsons.com';

User.merge(id, someAttributes, function(err, homer) {
  // ...
});
```

#### Authenticate

Authenticate against the CouchDB user database (`_users`).

Example:

```javascript
var username = req.param('username');
var password = req.param('password');

Users.authenticate(username, password, function(err, sessionId, username, roles) {
  // ...
});


#### Session

Get the CouchDB session object.

Example:

```javascript
var sessionId = req.cookies.sid;
Users.session(sessionId, function(err, session) {
  // ...
});
```