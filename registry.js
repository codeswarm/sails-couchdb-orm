var collections = {};
var dbs = {};

/// collection

exports.collection = collection;

function collection(name, collection) {
  if (! collection) return getCollection(name);
  else return setCollection(name, collection);
}

function setCollection(name, collection) {
  collections[name] = collection;
}

function getCollection(name) {
  return collections[name];
}


/// dbs

exports.db = db;

function db(name, db) {
  if (! db) return getDb(name);
  else return setDb(name, db);
}

function setDb(name, db) {
  dbs[name] = db;
}

function getDb(name) {
  return dbs[name];
}
