var fs = require('fs');
var path = require('path');

var async = require('async');
var rm = require('rimraf');
var debug = require('debug')('sync:sync');

var git = require('./lib/git');
var trash = require('./lib/trash');
var parse = require('./lib/parse');
var oss = require('./lib/oss');
var progressBar = require('./lib/progress');

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

  this.repo = git(path.join(this.source, '.sync'));
  this.oss = oss(options, this.source, this.dest);
  this.progressBar = progressBar();

}

Sync.prototype.init = function (done) {
  var repo = this.repo;
  var source = this.source;

  if (fs.existsSync(path.join(source, '.sync'))) {
    rm(path.join(source, '.sync', 'trash'), done)
  } else {
    fs.mkdir(path.join(source, '.sync'), function (err) {
      if (err) return done(err);
      repo.init(done)
    })
  }
};

Sync.prototype.exec = function (done) {
  done = done || new Function();
  var self = this;
  var repo = self.repo;
  var source = self.source;
  var oss = self.oss;
  var rollingStick;

  async.waterfall([
    function (callback) {
      self.init(callback);
    },
    function (callback) {
      trash(source, callback)
    },
    function (callback) {
      repo.add(callback)
    },
    function (add, callback) {
      repo.status(callback)
    },
    function (status, callback) {
      var queue = parse(status);
      debug('OSS operation queue:');
      debug(queue);
      rollingStick = setInterval(function () {
        self.progressBar.tick()
      }, 100);
      async.parallel({
        put: function (cb) {
          oss.putMultiObjects(queue.put, cb)
        },
        delete: function (cb) {
          oss.deleteMultiObjects(queue.delete, cb)
        }
      }, function ossResults(err, results) {
        debug('OSS operation Results:');
        debug(results);
        clearInterval(rollingStick);
        self.progressBar.terminate()
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


