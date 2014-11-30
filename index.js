/**
 * Module dependencies
 */

var nano      = require('nano');
var async     = require('async');
var extend    = require('xtend');
var cookie    = require('cookie');
var DeepMerge = require('deep-merge');
var _         = require('underscore');

var merge = DeepMerge(function(a, b) {
  return b;
});

var registry = require('./registry');
var views    = require('./views');



// You'll want to maintain a reference to each collection
// (aka model) that gets registered with this adapter.



var adapter = exports;

// Set to true if this adapter supports (or requires) things like data types, validations, keys, etc.
// If true, the schema for models using this adapter will be automatically synced when the server starts.
// Not terribly relevant if your data store is not SQL/schemaful.
adapter.syncable = false;


// Reserved attributes.
// These attributes get passed in to the `adapter.update` function even if they're not declared
// in the model schema.
adapter.reservedAttributes = ['id', 'rev'];


// Default configuration for collections
// (same effect as if these properties were included at the top level of the model definitions)
adapter.defaults = {

  port: 5984,
  host: 'localhost',
  https: false,
  username: null,
  password: null,

  schema: true,
  syncable: false,
  autoPK: false,
  pkFormat: 'string',

  maxMergeAttempts: 5,



  // If setting syncable, you should consider the migrate option,
  // which allows you to set how the sync will be performed.
  // It can be overridden globally in an app (config/adapters.js)
  // and on a per-model basis.
  //
  // IMPORTANT:
  // `migrate` is not a production data migration solution!
  // In production, always use `migrate: safe`
  //
  // drop   => Drop schema and data, then recreate it
  // alter  => Drop/add columns as necessary.
  // safe   => Don't change anything (good for production DBs)
  migrate: 'safe'
};

/**
 *
 * This method runs when a model is initially registered
 * at server-start-time.  This is the only required method.
 *
 * @param  {[type]}   collection [description]
 * @param  {Function} cb         [description]
 * @return {[type]}              [description]
 */
adapter.registerConnection = function registerConnection(connection, collections, cb) {

  var url = urlForConfig(connection);
  var db = nano(url);

  // Save the connection
  registry.connection(connection.identity, connection);

  async.each(_.keys(collections),function(modelIdentity,next) {
    adapter.registerSingleCollection(connection, modelIdentity, collections[modelIdentity], next);
  }, function afterAsyncEach (err) {
    if(err) {
      return cb(new Error("Problem when registering Collections"));
    }

    return cb();
  });
};

/**
 *
 * This method runs to register a single model, or collection.
 *
 * @param  {[type]}   connection [description]
 * @param  {[type]}   collection [description]
 * @param  {Function} cb         [description]
 * @return {[type]}              [description]
 */
adapter.registerSingleCollection = function registerCollection(connection, collectionName, collection, cb) {

  var url = urlForConfig(connection);

  // Wire up nano to the configured couchdb connection
  var db = nano(url);

  // console.log('registering %s', collectionName);
  // console.log('got db.db or whatever', db);
  // console.log('urlForConfig', url,connection);

  db.db.get(collectionName, function gotDatabase(err) {

    // No error means we're good!  The collection (or in couch terms, the "db")
    // is already known and ready to use.
    if (!err) {
      registry.collection(collectionName, collection);
      registry.db(collectionName, nano(url + collectionName));
      return cb();
    }

    try {
      if (err.status_code == 404 && err.reason == 'no_db_file') {
        db.db.create(collectionName, function createdDB(err) {
          if (err) {
            return cb(err);
          }

          adapter.registerSingleCollection(connection, collectionName, collection, cb);
        });
        return;
      }
      // console.log('unexpected ERROR', err);
      return cb(err);
    }
    catch (e) { return cb(e); }

  });

};


/**
 * Fired when a model is unregistered, typically when the server
 * is killed. Useful for tearing-down remaining open connections,
 * etc.
 *
 * @param  {Function} cb [description]
 * @return {[type]}      [description]
 */
adapter.teardown = function teardown(connection, cb) {
  process.nextTick(cb);
};


/**
 *
 * REQUIRED method if integrating with a schemaful
 * (SQL-ish) database.
 *
 * @param  {[type]}   collectionName [description]
 * @param  {Function} cb             [description]
 * @return {[type]}                  [description]
 */
adapter.describe = function describe(connection, collectionName, cb) {
  var collection = registry.collection(collectionName);
  if (! collection)
    return cb(new Error('no such collection'));

  return cb(null, collection.definition);
};


/**
 *
 *
 * REQUIRED method if integrating with a schemaful
 * (SQL-ish) database.
 *
 * @param  {[type]}   collectionName [description]
 * @param  {[type]}   relations      [description]
 * @param  {Function} cb             [description]
 * @return {[type]}                  [description]
 */
adapter.drop = function drop(connectionName, collectionName, relations, cb) {
  var connection = registry.connection(connectionName);
  var url = urlForConfig(connection);
  var db = nano(url);
  db.db.destroy(collectionName, cb);
};


/**
 * REQUIRED method if users expect to call Model.find(), Model.findOne(),
 * or related.
 *
 * You should implement this method to respond with an array of instances.
 * Waterline core will take care of supporting all the other different
 * find methods/usages.
 *
 * @param  {[type]}   connectionName [description]
 * @param  {[type]}   collectionName [description]
 * @param  {[type]}   criteria       [description]
 * @param  {Function} cb             [description]
 * @return {[type]}                  [description]
 */

adapter.find = find;

function find(connectionName, collectionName, criteria, cb, round) {
  if ('number' != typeof round) round = 0;

  // If you need to access your private data for this collection:
  var db = registry.db(collectionName);

  console.log('GETTING DB FOR "%s"."%s"', connectionName, collectionName);
  // console.log('got: ',db);
  if (!db) {
    return cb((function buildError(){
      var e = new Error();
      e.name = 'Adapter Error';
      e.type = 'adapter';
      e.code = 'E_ADAPTER';
      e.message = util.format('Could not acquire data access object (`db`) object for CouchDB connection "%s" for collection "%s"', connectionName, collectionName);
      e.connectionName = connectionName;
      e.collectionName = collectionName;
      return e;
    })());
  }

  // Build initial `dbOptions`
  var dbOptions = (function (dbOptions){
    if (criteria.limit) dbOptions.limit = criteria.limit;
    if (criteria.skip) dbOptions.skip = criteria.skip;
    return dbOptions;
  })({});

  var queriedAttributes = Object.keys(criteria.where || {});
  //console.log("Queried Attributes: ",queriedAttributes);

  // Handle case where no criteria is specified at all
  // (list all documents in the couch collection)
  if (queriedAttributes.length === 0) {
    console.log('Queried Attributes" (aka criteria\'s WHERE clause) doesn\'t contain any values-- listing everything!');

    // All docs
    dbOptions.include_docs = true;
    // TODO: test if limit works?
    // TODO: test if skip works?
    // TODO: test if sort works?
    db.list(dbOptions, function listReplied(err, docs) {
      if (err) {
        return cb(err);
      }

      if (!Array.isArray(docs) && docs.rows) {
        docs = docs.rows.map(prop('doc'));
      }
      else {}

      // either way...
      return cb(null, docs.map(docForReply));
    });
    return;
  }


  // Handle query for a single doc using the provided primary key criteria (e.g. `findOne()`)
  if (queriedAttributes.length == 1 && (queriedAttributes[0] == 'id' || queriedAttributes[0] == '_id')) {
    var id = criteria.where.id || criteria.where._id;

    db.get(id, dbOptions, function(err, doc) {
      if (err) {
        if (err.status_code == 404) {
          return cb(null, []);
        }
        return cb(err);
      }
      var docs = doc ? [doc] : [];
      return cb(null, docs.map(docForReply));
    });
    return;
  }

  // Take a look at `criteria.where.like`...
  asyncx_ifTruthy(criteria.where.like,

    // Handle "like" modifier using a view
    function ifSoDo(next){
      var viewName = views.name(criteria.where.like);
      var value = views.likeValue(criteria.where.like, true);
      dbOptions.startkey = value.startkey;
      dbOptions.endkey = value.endkey;
      return db.view('views', viewName, dbOptions, next);
    },

    // Handle general-case criteria queries using a view
    function elseDo (next){
      var viewName = views.name(criteria.where);
      dbOptions.key = views.value(criteria.where);
      return db.view('views', viewName, dbOptions, next);
    },

    function finallyDo(err, reply) {
      if (err) {
        if (err.status_code === 404 && round < 1) {
          views.create(db, criteria.where.like || criteria.where, function createdView(err) {
            if (err) {
              return cb(err);
            }
            find.call(connectionName, connectionName, collectionName, criteria, cb, round + 1);
          });
          return;
        }

        return cb(err);
      }

      return cb(null, reply.rows.map(prop('value')).map(docForReply));
    }
  );


}


/**
 *
 * REQUIRED method if users expect to call Model.create() or any methods
 *
 * @param  {[type]}   collectionName [description]
 * @param  {[type]}   values         [description]
 * @param  {Function} cb             [description]
 * @return {[type]}                  [description]
 */
adapter.create = function create(connectionName, collectionName, values, cb) {

  var db = registry.db(collectionName);
  db.insert(docForIngestion(values), replied);

  function replied(err, reply) {
    if (err) cb(err);
    else {
      var attrs = extend({}, values, { _id: reply.id, _rev: reply.rev });
      cb(null, docForReply(attrs));
    }
  }
};



/**
 *
 *
 * REQUIRED method if users expect to call Model.update()
 *
 * @param  {[type]}   collectionName [description]
 * @param  {[type]}   options        [description]
 * @param  {[type]}   values         [description]
 * @param  {Function} cb             [description]
 * @return {[type]}                  [description]
 */
adapter.update = function update(connectionName, collectionName, options, values, cb) {

  var searchAttributes = Object.keys(options.where);
  if (searchAttributes.length != 1)
    return cb(new Error('only support updating one object by id'));
  if (searchAttributes[0] != 'id')
    return cb(new Error('only support updating one object by id'));

  // Find the document
  adapter.find(connectionName, collectionName, options, function(err,docs) {
    var doc = docs[0]; // only one document with that id
    if(!doc) return cb('No document found to update.');

    delete values.id; // deleting id from values attr
    Object.keys(values).forEach(function(key) {
      doc[key] = values[key];
    });

    //console.log('Document to update: ', doc);
    var db = registry.db(collectionName);
    db.insert(docForIngestion(doc), options.where.id, function(err, reply) {
      if (err) cb(err);
      else {
        var attrs = extend({}, doc, { _id: reply.id, _rev: reply.rev });
        cb(null, docForReply(attrs));
      }
    });
  });
};


/**
 *
 * REQUIRED method if users expect to call Model.destroy()
 *
 * @param  {[type]}   collectionName [description]
 * @param  {[type]}   options        [description]
 * @param  {Function} cb             [description]
 * @return {[type]}                  [description]
 */
adapter.destroy = function destroy(connectionName, collectionName, options, cb) {
  var db = registry.db(collectionName);

  // Find the record
  adapter.find(connectionName,collectionName,options, function(err,docs) {
    async.each(docs,function(item) { // Shoud have only one.
      db.destroy(item.id, item.rev, function(err, doc) {
        cb(err,[doc]); // Waterline expects an array as result.
      });
    });
  });
};



/**********************************************
 * Custom methods
 **********************************************/


/// Authenticate

adapter.authenticate = function authenticate(connection, collectionName, username, password, cb) {
  var db = registry.db(collectionName);

  db.auth(username, password, replied);

  function replied(err, body, headers) {
    if (err) cb(err);
    else {
      var sessionId;
      var header = headers['set-cookie'][0];
      if (header) sessionId = cookie.parse(header).AuthSession;
      cb(null, sessionId, username, body.roles);
    }
  }
};


/// Session

adapter.session = function session(connection, collectionName, sid, cb) {
  var url = urlForConfig(registry.connection(connection));

  var sessionDb = nano({
    url: url,
    cookie: 'AuthSession=' + encodeURIComponent(sid)
  });

  sessionDb.session(cb);
};



/// Merge

adapter.merge = function adapterMerge(connectionName, collectionName, id, attrs, cb, attempts) {
  var doc;
  var db = registry.db(collectionName);

  var coll = registry.collection(collectionName);
  /*
  console.log('------------------------------------------');
  console.log('Attempting merge on ',collectionName,id,attrs);
  console.log('------------------------------------------');
  */

  if ('number' != typeof attempts) attempts = 0;
  else if (attempts > 0) {
    //var config = coll.adapter.config;
    // Reference to maxMergeAttempts
    if (attempts > 5) {
      return cb(new Error('max attempts of merging reached'));
    }
  }

  db.get(id, got);

  function got(err, _doc) {
    if (err && err.status_code == 404) _doc = {};
    else if (err) return cb(err);

    delete attrs._rev;

    _doc = docForReply(_doc);

    doc = merge(_doc, attrs);
    //console.log('----------Callbacks',coll._callbacks.beforeUpdate);
    async.eachSeries(coll._callbacks.beforeUpdate || [], invokeCallback, afterBeforeUpdate);
  }

  function invokeCallback(fn, cb) {
    //console.log("----------Calling Function ",fn);
    fn.call(null, doc, cb);
  }

  function afterBeforeUpdate(err) {
    if (err) return cb(err);

    var newdoc = docForIngestion(doc);
    //console.log('----------Heres our final doc',newdoc._id,newdoc._rev);
    console.trace();

    db.insert(newdoc, id, saved);
  }

  function saved(err, reply) {
    if (err && err.status_code == 409) {
      //console.log('Calling merge again!');
      adapter.merge(connectionName, collectionName, id, attrs, cb, attempts + 1);
    }
    else if (err) cb(err);
    else {
      extend(doc, { _rev: reply.rev, _id: reply.id });
      doc = docForReply(doc);
      callbackAfter();
    }
  }

  function callbackAfter() {
    async.eachSeries(coll._callbacks.afterUpdate || [], invokeCallback, finalCallback);
  }

  function finalCallback(err) {
    if (err) cb(err);
    else cb(null, doc);
  }

};



/// View

adapter.view = function view(connectionName, collectionName, viewName, options, cb, round) {
  if ('number' != typeof round) round = 0;
  var db = registry.db(collectionName);

  db.view('views', viewName, options, viewResult);

  function viewResult(err, results) {
    if (err && err.status_code == 404 && round < 2)
      populateView(connectionName, collectionName, viewName, populatedView);
    else if (err) cb(err);
    else cb(null, (results && results.rows && results.rows || []).map(prop('value')).map(docForReply));
  }

  function populatedView(err) {
    if (err) cb(err);
    else adapter.view(connectionName, collectionName, viewName, options, cb, round + 1);
  }
};

function populateView(connectionName, collectionName, viewName, cb) {
  var collection = registry.collection(collectionName);

  var view = collection.views && collection.views[viewName];
  if (! view) return cb(new Error('No view named ' + viewName + ' defined in model ' + collectionName));
  else {
    var db = registry.db(collectionName);
    db.get('_design/views', gotDDoc);
  }

  function gotDDoc(err, ddoc) {
    if (! ddoc) ddoc = {};
    if (! ddoc.views) ddoc.views = {};
    if (! ddoc._id) ddoc._id = '_design/views';

    ddoc.views[viewName] = view;
    ddoc.language = 'javascript';

    db.insert(ddoc, insertedDDoc);
  }

  function insertedDDoc(err) {
    cb(err);
  }
}



/// Utils


function urlForConfig(config) {
  var schema = 'http';
  if (config.https) schema += 's';

  var auth = '';
  if (config.username && config.password) {
    auth = encodeURIComponent(config.username) + ':' + encodeURIComponent(config.password) + '@';
  }

  return [schema, '://', auth, config.host, ':', config.port, '/'].join('');
}

function prop(p) {
  return function(o) {
    return o[p];
  };
}

function docForReply(doc) {
  if (doc._id) {
    doc.id = doc._id;
    delete doc._id;
  }
  if (doc._rev) {
    doc.rev = doc._rev;
    delete doc._rev;
  }

  return doc;
}

function docForIngestion(doc) {
  doc = extend({}, doc);
  if (doc.id) {
    doc._id = doc.id;
    delete doc.id;
  }
  if (doc.rev) {
    doc._rev = doc.rev;
    delete doc.rev;
  }

  return doc;
}



/**
 * Branch to the appropriate fn if the provided value is truthy.
 *
 * @param  {*} valToTest
 * @param  {Function} ifSoDo(next)
 * @param  {Function} elseDo(next)
 * @param  {Function} finallyDo(err, results)
 */
function asyncx_ifTruthy (valToTest, ifSoDo, elseDo, finallyDo){
  return (valToTest ? ifSoDo : elseDo)(finallyDo);
}

