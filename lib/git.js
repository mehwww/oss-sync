var path = require('path');
var exec = require('child_process').exec;

var Promise = require('bluebird');
var debug = require('debug')('sync:git');

exports = module.exports = Git;

function Git(repo) {
  if (!(this instanceof Git)) {
    return new Git(repo);
  }
  this.repo = repo;
}

//Git.prototype.exec = function () {
//  var self = this;
//  var path = self.repo;
//  var command = self._command;
//  return new Promise(function (resolve, reject) {
//    exec(command, {cwd: path}, function (err, stdout, stderr) {
//      if (err) {
//        reject(err);
//      } else {
//        resolve(stdout);
//        debug('Git exec %s', self._command);
//        self._command = '';
//      }
//    });
//  })
//  //exec(command, {cwd: path}, function (err, stdout, stderr) {
//  //  callback(err, stdout);
//  //  debug('Git exec %s', self._command);
//  //  self._command = '';
//  //});
//}

Git.prototype.command = function (operation, flags, options) {
  var self = this;
  var flags = flags || [];
  var options = options || '';
  var path = self.repo;
  //this._command = 'git ' + operation + ' ' + flags.join(' ') + ' ' + options;
  //return this
  var command = 'git ' + operation + ' ' + flags.join(' ') + ' ' + options;
  return new Promise(function (resolve, reject) {
    exec(command, {cwd: path}, function (err, stdout, stderr) {
      if (err) {
        reject(err);
      } else {
        resolve(stdout);
        debug('Git exec %s', command);
      }
    });
  })

}

Git.prototype.status = function () {
  return this.command('status')
}

Git.prototype.commit = function () {
  return this.command('commit', ['--amend', '--no-status', '--no-edit', '--allow-empty'])
}

Git.prototype.add = function () {
  return this.command('add', ['--all'])
}

Git.prototype.init = function (callback) {
  var self = this;
  debug('Git init');
  return Promise.resolve()
    .then(function () {
      return self.command('init')
    })
    .then(function () {
      return self.command('commit', ['--allow-empty', '-m'], '"oss-sync commit"')
    })

  //self.command('init').exec(function (err, init) {
  //  if (err) return callback(err);
  //  self
  //    .command('commit', ['--allow-empty', '-m'], '"oss-sync commit"')
  //    .exec(function (err, commit) {
  //      callback(err)
  //    })
  //})
}

