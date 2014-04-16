![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png)

# Waterline CouchDB Adapter

Waterline adapter for CouchDB.

## Install

Add this module to your sails.js project:

```bash
$ npm install sails-couchdb-orm --save
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

## Sails.js

http://sailsjs.org

## Waterline

[Waterline](https://github.com/balderdashy/waterline) is a brand new kind of storage and retrieval engine.

It provides a uniform API for accessing stuff from different kinds of databases, protocols, and 3rd party APIs. That means you write the same code to get users, whether they live in MySQL, LDAP, MongoDB, or Facebook.


## Contributors

Thanks so much to Pedro Teixeira([@pgte](https://twitter.com/pgte)) for building this adapter.

## License

### The MIT License (MIT)

Copyright © 2014 CodeSwarm, Inc. 

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

