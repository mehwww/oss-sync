var fs = require('fs');
var path = require('path');

var Promise = require('bluebird');
var rm = Promise.promisify(require('rimraf'));
//var mkdir = Promise.promisify(fs.mkdir);
//var rm = require('rimraf');
var debug = require('debug')('sync:sync');

var Git = require('./git');
var trash = require('./trash');
var parse = require('./parse');
var OSS = require('./oss');

exports = module.exports = Sync;

function Sync(options) {
  if (!(this instanceof Sync)) {
    return new Sync(options);
  }

  var basePath = process.cwd();

  this.source = path.resolve(basePath, options.source);
  this.dest = options.dest[0] == '/'
    ? options.dest.substr(1)
    : options.dest

  this.repo = new Git(path.join(this.source, '.sync'));
  this.oss = new OSS(options, this.source, this.dest);

}

//Sync.prototype.init = function (done) {
//  var repo = this.repo;
//  var source = this.source;
//
//  if (fs.existsSync(path.join(source, '.sync'))) {
//    rm(path.join(source, '.sync', 'trash'), done)
//  } else {
//    fs.mkdir(path.join(source, '.sync'), function (err) {
//      if (err) return done(err);
//      repo.init(done)
//    })
//  }
//};

Sync.prototype.init = function () {
  var repo = this.repo;
  var source = this.source;

  debug('Sync init')

  if (fs.existsSync(path.join(source, '.sync'))) {
    return rm(path.join(source, '.sync', 'trash'))
  } else {
    fs.mkdirSync(path.join(source, '.sync'));
    return repo.init();
  }

  //fs.mkdir(path.join(source, '.sync'), function (err) {
  //  if (err) return done(err);
  //  repo.init(done)
  //})
}


//Sync.prototype.exec = function (done) {
//  done = done || new Function();
//  var self = this;
//  var repo = self.repo;
//  var source = self.source;
//  var oss = self.oss;
//
//  async.waterfall([
//    function (callback) {
//      self.init(callback);
//    },
//    function (callback) {
//      trash(source, callback)
//    },
//    function (callback) {
//      repo.add(callback)
//    },
//    function (add, callback) {
//      repo.status(callback)
//    },
//    function (status, callback) {
//      var queue = parse(status);
//      debug('OSS operation queue:');
//      debug(queue);
//      async.parallel({
//        put: function (cb) {
//          oss.putMultiObjects(queue.put, cb)
//        },
//        delete: function (cb) {
//          oss.deleteMultiObjects(queue.delete, cb)
//        }
//      }, function ossResults(err, results) {
//        debug('OSS operation Results:');
//        debug(results);
//        callback(err, results)
//      })
//    },
//    function (syncResult, callback) {
//      repo.commit(callback)
//    }
//  ], function (err, commit) {
//    done(err, commit)
//  })
//};

Sync.prototype.exec = function () {
  var self = this;
  var repo = self.repo;
  var source = self.source;
  var oss = self.oss;

  return self.init()
    .delay(200)
    .then(function () {
      trash(source);
    })
    .delay(200)
    .then(function () {
      return repo.add()
    })
    .then(function () {
      return repo.status()
    })
    .then(function (status) {
      var queue = parse(status);
      debug('OSS operation queue:');
      debug(queue);
      return queue
    })
    .then(function (queue) {
      return oss.putMultiObjects(queue)
    })
    .then(function (queue) {
      return oss.deleteMultiObjects(queue)
    })
    .then(function () {
      return repo.commit()
    })
    .then(function () {
      debug('Sync complete!');
    }, function (err) {
      debug('Error occurred!');
      debug(err);
      return Promise.reject(err);
    })
}

