'use strict'

const fs = require('fs')
const path = require('path')

const Promise = require('bluebird')
const rm = Promise.promisify(require('rimraf'))
const mkdir = Promise.promisify(fs.mkdir)

const Git = require('./git')
const OSS = require('./oss')
const trash = require('./trash')
const parse = require('./parse')

class Sync {
  constructor (options) {
    let basePath = process.cwd()

    this.source = path.resolve(basePath, options.source)
    this.dest = options.dest[0] === '/'
      ? options.dest.substr(1)
      : options.dest

    this.repo = new Git(path.join(this.source, '.sync'))
    this.oss = new OSS(options, this.source, this.dest)

    this.forceUpload = !!options.forceUpload
    this.incrementalMode = !!options.incrementalMode
  }

  exec () {
    const self = this
    let repo = self.repo
    let source = self.source
    let oss = self.oss
    let forceUpload = self.forceUpload
    let incrementalMode = self.incrementalMode

    let syncPath = path.join(source, '.sync')
    let trashPath = path.join(source, '.sync', 'trash')

    let isDirty = fs.existsSync(path.join(source, '.sync'))

    return init()
      .then(() => generateQueue())
      .spread((putList, deleteList) => handleQueue(putList, deleteList))

    // Init .sync folder to save trash and git status
    // and generate trash
    function init () {
      return Promise.resolve()
        .then(() => {
          if (forceUpload) {
            return rm(syncPath).then(function () {
              return mkdir(syncPath)
            })
          }
          if (isDirty) {
            if (incrementalMode) {
              return
            } else {
              return rm(trashPath)
            }
          }
          return mkdir(syncPath)
        })
        .then(() => repo.init())
        .then(() => trash(source, {
          modified: incrementalMode,
          clobber: !incrementalMode
        }))
    }

    // Use git status to generate operation queue
    function generateQueue () {
      return repo.add()
        .then(() => repo.status())
        .then((status) => {
          let queue = parse(status)
          return [queue.put, queue.delete]
        })
    }

    // Upload and delete objects
    function handleQueue (putList, deleteList) {
      return Promise.resolve()
        .then(() => oss.putMultiObjects(putList))
        .then(() => oss.deleteMultiObjects(deleteList))
        // All complete and git commit
        .then(() => repo.commit())
    }
  }

}


exports = module.exports = Sync
