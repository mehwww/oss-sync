'use strict'

const Promise = require('bluebird')
const fs = require('fs')
const path = require('path')

class Upload {
  constructor (options, oss) {
    this.source = options.source
    this.file = options.file
    this.oss = oss
    this.readStream = undefined
    this.readable = false
    this.highWaterMark = options.highWaterMark || 0.5 * 1024 * 1024
    this.pending = Math.ceil(options.filesize / this.highWaterMark) || 1
    this.r = {
      stream: undefined,
      readable: false,
      queue: []
    }
    this.u = {
      uploadId: undefined,
      partNum: 0,
      multipartMap: {Parts: []}
    }
  }

  read (resolve) {
    if (this.r.readable) {
      resolve(this.r.stream.read())
      this.r.readable = false
    } else {
      this.r.queue.push(resolve)
    }
  }

  init () {
    const self = this
    const source = self.source
    const file = self.file
    const oss = self.oss
    self.fresh = false

    return Promise.all([
      createReadStream(path.join(source, file)),
      oss.createMultipartUpload({file: file})
    ]).spread((stream, mp) => {
      self.r.stream = stream.on('readable', () => {
        self.r.readable = true
        if (self.r.queue.length) {
          self.read(self.r.queue.shift())
        }
      })
      self.u.uploadId = mp.UploadId
    })

    function createReadStream (file) {
      return new Promise((resolve, reject) => {
        let stream = fs.createReadStream(file, {highWaterMark: self.highWaterMark})
        resolve(stream)
      })
    }
  }

  exec (throat) {
    const self = this
    const file = self.file
    const oss = self.oss

    if (self.pending === 1) return self.tiny()

    return new Promise((resolve, reject) => {
      return self.init().then(() => {
        let queuePending = self.pending
        while (queuePending) {
          queuePending--
          throat(() => {
            return readPart().then((buf) => {
              return uploadPart(buf)
            }).then(() => {
              self.pending--
              if (self.pending === 0) return self.complete().then(resolve)
            })
          })
        }
        return null
      })
    })

    function readPart () {
      return new Promise((resolve, reject) => {
        self.read(resolve)
      })
    }

    function uploadPart (buf) {
      return oss.uploadPart(buf, {
        partNum: ++self.u.partNum,
        file: file,
        uploadId: self.u.uploadId
      }).then((result) => {
        self.u.multipartMap.Parts[result.PartNumber - 1] = result
      })
    }
  }

  complete () {
    const self = this
    const file = self.file
    const oss = self.oss

    return oss.completeMultipartUpload({
      file: file,
      multipartMap: self.u.multipartMap,
      uploadId: self.u.uploadId
    })
  }

  abort () {

  }

  tiny () {
    const oss = this.oss
    const source = this.source
    const file = this.file
    const read = Promise.promisify(fs.readFile)

    return read(path.join(source, file))
      .then((buf) => oss.putObject(buf, {file: file}))
  }
}

module.exports = Upload
