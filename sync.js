var fs = require('fs');
var path = require('path');

var async = require('async');
var rm = require('rimraf');
var debug = require('debug')('sync:sync');

var git = require('./lib/git');
var trash = require('./lib/trash');
var parse = require('./lib/parse');
var oss = require('./lib/oss');

exports = module.exports = Sync;

function Sync(options) {
  if (!(this instanceof Sync)) {
    return new Sync(options);
  }
  this.initialized = false;

  this.accessKeyId = options.accessKeyId;
  this.secretAccessKey = options.secretAccessKey;
  this.endpoint = options.endpoint;

  this.source = path.resolve(options.source);
  this.dest = options.dest[0] == '/'
    ? options.dest.substr(1)
    : options.dest

  this.repo = git(path.join(this.source, '.sync'));
  this.oss = oss(options, this.source, this.dest);

  if (fs.existsSync(path.join(this.source, '.sync'))) {
    this.initialized = true;
  }
}

Sync.prototype.init = function (done) {
  var self = this;
  var repo = self.repo;
  if (!self.initialized) {
    fs.mkdir(path.join(self.source, '.sync'), function (err) {
      debug('mkdir ".sync" success')
      if (err) return done(err);
      repo.init(function (err, commit) {
        if (!err) {
          self.initialized = true;
          done()
        } else {
          done(err)
        }
      })
    })
  } else {
    rm(path.join(self.source, '.sync', 'trash'), function (err) {
      done(err)
    })
  }
};

Sync.prototype.exec = function (done) {
  done = done || new Function();
  var self = this;
  var repo = self.repo;
  async.waterfall([
    function (callback) {
      self.init(callback);
    },
    function (callback) {
      trash(self.source, callback)
    },
    function (callback) {
      repo.add(callback)
    },
    function (add, callback) {
      repo.status(callback)
    },
    function (status, callback) {
      var queue = parse(status);
      debug(queue);
      async.parallel({
        put: function (cb) {
          self.oss.putMultiObjects(queue.put, cb)
        },
        delete: function (cb) {
          self.oss.deleteMultiObjects(queue.delete, cb)
        }
      }, function ossResults(err, results) {
        callback(err, results)
      })
    },
    function (syncResult, callback) {
      repo.commit(callback)
    }
  ], function (err, commit) {
    done(err, commit)
  })
};


