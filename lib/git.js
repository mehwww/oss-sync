var path = require('path');
var exec = require('child_process').exec;
var debug = require('debug')('sync:git');


exports = module.exports = Git;

function Git(repo) {
  if (!(this instanceof Git)) {
    return new Git(repo);
  }
  this.repo = repo;
}

Git.prototype.exec = function (callback) {
  var self = this;
  var path = self.repo;
  var command = self._command;
  exec(command, {cwd: path}, function (err, stdout, stderr) {
    callback(err, stdout);
    debug('Git exec %s', self._command);
    self._command = '';
  });
}

Git.prototype.command = function (operation, flags, options) {
  flags = flags || [];
  options = options || '';
  this._command = 'git ' + operation + ' ' + flags.join(' ') + ' ' + options;
  return this
}

Git.prototype.status = function (callback) {
  this.command('status').exec(callback)
}

Git.prototype.commit = function (callback) {
  this.command('commit', ['--amend', '--no-status', '--no-edit', '--allow-empty']).exec(callback)
}

Git.prototype.init = function (callback) {
  debug('Git init')
  var self = this;
  self.command('init').exec(function (err, init) {
    if (err) return callback(err);
    self
      .command('commit', ['--allow-empty', '-m'], '"oss-sync commit"')
      .exec(function (err, commit) {
        callback(err)
      })
  })
}

Git.prototype.add = function (callback) {
  return this.command('add', ['--all']).exec(callback)
}