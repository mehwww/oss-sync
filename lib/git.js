'use strict'

const Promise = require('bluebird')
const spawn = require('child_process').spawn

class Git {
  constructor (repo) {
    this.repo = repo
  }

  command (operation, flags, options) {
    let self = this
    let path = self.repo
    let command = 'git'
    let args = [].concat(operation).concat(flags || []).concat(options || [])

    return new Promise(function (resolve, reject) {
      let result = spawn(command, args, {cwd: path})
      let chunks = []
      let size = 0
      result.stdout.on('data', function (chunk) {
        chunks.push(chunk)
        size += chunk.length
      })
      result.stdout.on('end', function () {
        resolve(Buffer.concat(chunks, size).toString('utf8'))
      })
      result.on('error', function (err) {
        reject(err)
      })
    })
  }

  status () {
    return this.command('status')
  }

  commit () {
    return this.command('commit', ['--amend', '--no-status', '--no-edit', '--allow-empty', '-m'], '"oss-sync commit"')
  }

  add () {
    return this.command('add', ['--all'])
  }

  init () {
    let self = this
    return self.command('init')
      .then(() => self.command('config', ['--file', `${self.repo}/.git/config`], 'core.quotepath false'))
      .then(() => self.command('commit', ['--allow-empty', '-m'], '"oss-sync commit"'))
  }
}

exports = module.exports = Git
