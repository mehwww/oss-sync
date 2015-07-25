var fs = require('fs');
var path = require('path');

var Promise = require('bluebird');
var rm = Promise.promisify(require('rimraf'));
var chalk = require('chalk');
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
    : options.dest;

  this.repo = new Git(path.join(this.source, '.sync'));
  this.oss = new OSS(options, this.source, this.dest);
}

Sync.prototype.init = function () {
  var repo = this.repo;
  var source = this.source;

  debug('Sync init')

  if (!fs.existsSync(path.join(source, '.sync'))) {
    fs.mkdirSync(path.join(source, '.sync'));
    return repo.init();
  }
  else {
    return Promise.resolve();
  }
}

Sync.prototype.exec = function () {
  var self = this;
  var repo = self.repo;
  var source = self.source;
  var oss = self.oss;

  var start = Date.now();
  var profiler = function(message, promise) {
        var last = Date.now();
        promise.then(function() {
            var end = Date.now();
            console.log(chalk.grey(message + " takes: " + (end - last) + "ms of " + (end - start) + "ms"));
        });
        return promise;
  }

  return self.init()
    //generate trash
    .then(function () {
      return profiler("Building", trash(source));
    })
    //add to git index
    .then(function () {
      return profiler("Git add", repo.add());
    })
    //use git status to generate operation queue
    .then(function () {
      return profiler("Git status", repo.status());
    })
    .then(function (status) {
      var queue = parse(status);
      debug('OSS operation queue:');
      debug(queue);
      return queue
    })
    //put objects
    .then(function (queue) {
      return oss.putMultiObjects(queue)
    })
    //delete objects
    .then(function (queue) {
      return oss.deleteMultiObjects(queue)
    })
    .then(function () {
      return profiler("Git commit", repo.commit());
    })
    .then(function () {
      debug('Sync complete!');
    }, function (err) {
      debug('Error occurred!');
      debug(err);
      return Promise.reject(err);
    })
}
