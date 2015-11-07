var spawn = require('child_process').spawn;

var Promise = require('bluebird');
var debug = require('debug')('sync:git');

exports = module.exports = Git;

function Git(repo) {
  this.repo = repo;
}

Git.prototype.command = function (operation, flags, options) {
  var self = this;
  var flags = flags || [];
  var options = options || [];
  var path = self.repo;
  var command = 'git'
  var args = [].concat(operation).concat(flags).concat(options)
  var chunks = []
  var size = 0
  return new Promise(function (resolve, reject) {
    var result = spawn(command, args, {cwd: path})
    result.stdout.on('data', function (chunk) {
      chunks.push(chunk)
      size += chunk.length
    })
    result.stdout.on('end', function () {
      console.log(command, args)
      console.log(Buffer.concat(chunks, size).toString('utf8'))
      resolve(Buffer.concat(chunks, size).toString('utf8'))
    })
    result.on('error', function (err) {
      reject(err)
    })
  })
}

Git.prototype.status = function () {
  return this.command('status')
}

Git.prototype.commit = function () {
  return this.command('commit', ['--amend', '--no-status', '--no-edit', '--allow-empty', '-m'], '"oss-sync commit"')
}

Git.prototype.add = function () {
  return this.command('add', ['--all'])
}

Git.prototype.init = function () {
  var self = this;
  debug('Git init');
  return Promise.resolve()
    .then(function () {
      return self.command('init')
    })
    .then(function () {
      return self.command('config',['--file', self.repo + '/.git/config'],'core.quotepath false')
    })
    .then(function () {
      return self.command('commit', ['--allow-empty', '-m'], '"oss-sync commit"')
    })
}
