'use strict'

const fs = require('fs')
const path = require('path')

const Promise = require('bluebird')
const size = require('filesize')
const chalk = require('chalk')
const rm = Promise.promisify(require('rimraf'))
const mkdir = Promise.promisify(fs.mkdir)
const throat = require('throat')(3)

const Git = require('./git')
const OSS = require('./oss')
const Upload = require('./upload')
const trash = require('./trash')
const parse = require('./parse')
const print = require('./print')

class Sync {
  constructor (options) {
    const basePath = process.cwd()

    this.source = path.resolve(basePath, options.source)
    this.dest = options.dest[0] === '/'
      ? options.dest.substr(1)
      : options.dest

    this.repo = new Git(path.join(this.source, '.sync'))
    this.oss = new OSS(options)

    this.forceUpload = !!options.forceUpload
    this.incrementalMode = !!options.incrementalMode
  }

  // Init .sync folder to save trash and git status
  // and generate trash
  init () {
    const self = this
    const repo = self.repo
    const source = self.source

    const forceUpload = self.forceUpload
    const incrementalMode = self.incrementalMode

    const syncPath = path.join(source, '.sync')
    const trashPath = path.join(source, '.sync', 'trash')

    const stat = Promise.promisify(fs.stat)

    return mode()
      .then(() => repo.init())
      .then(() => trash(source, {
        incrementalMode: incrementalMode
      }))

    function mode () {
      return stat(path.join(source, '.sync')).then(() => {
        // Dirty
        return forceUpload
          ? rm(syncPath).then(() => mkdir(syncPath))
          : (incrementalMode ? Promise.resolve() : rm(trashPath))
      }, () => {
        // Clean
        return mkdir(syncPath)
      })
    }
  }

  // Use git status to generate operation queue
  queue () {
    const repo = this.repo
    return repo.add()
      .then(() => repo.status())
      .then((status) => {
        const queue = parse(status)
        console.log(`  ${chalk.cyan('Build:')} \u2714`)
        console.log()
        return [queue.put, queue.delete]
      })
  }

  // Upload objects
  execUpload (list) {
    const oss = this.oss
    const source = this.source
    const stat = Promise.promisify(fs.stat)
    const bar = new print.Bar()

    let total = 0
    let progress = 0

    return Promise.map(list, (file) => {
      return stat(path.join(source, file))
        .then((stat) => {
          total += stat.size
          return {
            file: file,
            size: stat.size
          }
        })
    }).tap(() => {
      oss.on('uploadProgress', onPrgress)
      bar.tick(`  ${chalk.cyan('Upload:')} [:bar] ${size(progress)} / ${size(total)}`, {current: progress, total: total})
    }).map((params) => {
      return new Upload({
        source: source,
        file: params.file,
        filesize: params.size
      }, oss).exec(throat)
    }).tap(() => {
      oss.removeListener('uploadProgress', onPrgress)
      bar.render(`  ${chalk.cyan('Upload:')} [:bar] ${size(progress)} / ${size(total)}  \u2714`, {current: progress, total: total})
      bar.end()
      console.log()
    })

    function onPrgress (length) {
      progress += length
      bar.tick(`  ${chalk.cyan('Upload:')} [:bar] ${size(progress)} / ${size(total)}`, {current: progress, total: total})
    }
  }

  // Delete objects
  execDelete (list) {
    const oss = this.oss
    return oss.deleteMultipleObjects(list).tap(() => {
      console.log(`  ${chalk.red('Delete:')} \u2714`)
      console.log()
    })
  }

  exec () {
    console.log()
    return this.init()
      .then(() => this.queue())
      .spread((uploadList, deleteList) => {
        return this.execUpload(uploadList).then(() => this.execDelete(deleteList))
      })
  }
}

exports = module.exports = Sync
