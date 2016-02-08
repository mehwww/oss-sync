'use strict'

const fs = require('fs')
const path = require('path')

const Promise = require('bluebird')
const mime = require('mime')
const chalk = require('chalk')
const SDK = require('aliyun-sdk')
const size = require('filesize')

const print = require('./print')

class OSS {
  constructor (config, source, dest) {
    this.client = new SDK.OSS({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      endpoint: config.endpoint,
      apiVersion: config.apiVersion || '2013-10-15'
    })
    this.bucket = config.bucket
    this.source = source
    this.dest = dest
  }

  deleteMultiObjects (list) {
    const self = this
    const client = self.client
    const bucket = self.bucket

    if (list.length === 0) return Promise.resolve()

    return Promise.resolve()
      .then(() => print.title(chalk.red('Delete:')))
      .then(() => list.map((file) => {
        print.line(path.join(self.source, file))
        return {Key: path.join(self.dest, file)}
      }))
      .then((deleteObjects) => {
        return new Promise(function (resolve, reject) {
          client.deleteObjects({
            Bucket: bucket,
            Delete: {
              Objects: deleteObjects,
              Quiet: true
            }
          }, function (err, result) {
            if (err) return reject(err)
            resolve(result)
          })
        })
      })
  }

  putMultiObjects (list) {
    const self = this

    if (list.length === 0) return Promise.resolve()

    return Promise.resolve()
      .then(() => print.title(chalk.cyan('Upload:')))
      .then(() => Promise.map(list, (file) => {
        let source = path.join(self.source, file)
        let dest = path.join(self.dest, file)
        let fsize = fs.statSync(source).size

        if (fsize > 10 * 1048576) {
          return self.putBigObject(source, dest, fsize)
        } else {
          return self.putObject(source, dest, fsize)
        }
      }, {concurrency: 1}))
  }

  putObject (source, dest, fsize) {
    const self = this
    const client = self.client
    const bucket = self.bucket

    // const bar = new ProgressBar('  :filename  :filesize  :clapping')
    const bar = new print.Bar('  :filename  :filesize  :clapping')
    const tokens = {
      filename: source,
      filesize: size(fsize)
    }

    const readFile = Promise.promisify(require('fs').readFile)

    return readFile(source)
      .tap(function () {
        bar.render(tokens)
        bar.automate(tokens)
      })
      .then(uploadFile)
      .finally(function () {
        bar.end()
      })
      .then(function () {
        console.log('  ' + tokens.filename + '  ' + tokens.filesize + '  ' + chalk.cyan('\u2714'))
      })
      .catch(function (err) {
        console.log('  ' + tokens.filename + '  ' + tokens.filesize + '  ' + chalk.cyan('\u2718'))
        return Promise.reject(err)
      })

    function uploadFile (data) {
      return new Promise(function (resolve, reject) {
        client.putObject({
          Bucket: bucket,
          Key: dest,
          Body: data,
          ContentType: mime.lookup(source),
          ServerSideEncryption: 'AES256'
        }, function (err, putResult) {
          if (err) {
            return reject(err)
          } else {
            resolve(putResult)
          }
        })
      })
    }
  }

  putBigObject (source, dest, fsize) {
    const self = this
    let client = self.client
    let bucket = self.bucket

    let uploadId
    // part size must between 0.5M and 5M
    let partSize = Math.min(Math.max(Math.ceil(fsize / 100), 0.5 * 1048576), 5 * 1048576)
    let partsTotal = Math.ceil(fsize / partSize)

    let multipartMap = {Parts: []}

    let bar = new print.Bar('  :filename  :filesize  [:bar] :percent', {total: partsTotal})
    let tokens = {
      filename: source,
      filesize: size(fsize)
    }

    return Promise.resolve()
      .then(initUpload)
      .then(function () {
        bar.render(tokens)
        return new Array(partsTotal)
      })
      .map(function (useless, partNum) {
        return Promise.resolve()
          .then(readPart.bind(null, partNum))
          .then(uploadPart.bind(null, partNum))
          .then(function () {
            bar.tick()
          })
      }, {concurrency: 3})
      .then(completeUpload)
      .finally(function () {
        bar.end()
      })
      .then(function () {
        console.log('  ' + tokens.filename + '  ' + tokens.filesize + '  ' + chalk.cyan('\u2714'))
      })
      .catch(function (err) {
        console.log('  ' + tokens.filename + '  ' + tokens.filesize + '  ' + chalk.cyan('\u2718'))
        return Promise.reject(err)
      })


    function initUpload () {
      return new Promise(function (resolve, reject) {
        client.createMultipartUpload({
          Bucket: bucket,
          Key: dest,
          ContentType: mime.lookup(source)
        }, function (mpErr, multipart) {
          if (mpErr) {
            reject(mpErr)
          } else {
            uploadId = multipart.UploadId
            resolve(multipart)
          }
        })
      })
    }

    function readPart (partNum) {
      return new Promise(function (resolve, reject) {
        let start = partNum * partSize
        let end = partNum === partsTotal - 1 ? fsize - 1 : (partNum + 1) * partSize - 1
        let fileReadStream = fs.createReadStream(source, {
          start: start,
          end: end
        })
        let chunks = []
        let size = 0

        fileReadStream.on('data', function (chunk) {
          chunks.push(chunk)
          size += chunk.length
        })
        fileReadStream.on('end', function () {
          resolve(Buffer.concat(chunks, size))
        })
        fileReadStream.on('error', function (err) {
          reject(err)
        })
      })
    }

    function uploadPart (partNum, buf) {
      return new Promise(function (resolve, reject) {
        client.uploadPart(getPartParams(partNum + 1, uploadId, buf), function (partErr, partData) {
          if (partErr) {
            reject(partErr)
          } else {
            multipartMap.Parts[this.request.params.PartNumber - 1] = {
              ETag: partData.ETag,
              PartNumber: Number(this.request.params.PartNumber)
            }
            resolve(uploadId)
          }
        })
      })
    }

    function completeUpload () {
      return new Promise(function (resolve, reject) {
        client.completeMultipartUpload({
          Bucket: bucket,
          Key: dest,
          CompleteMultipartUpload: multipartMap,
          UploadId: uploadId
        }, function (completeErr, completeData) {
          if (completeErr) {
            reject(completeErr)
          } else {
            resolve(completeData)
          }
        })
      })
    }

    function getPartParams (partNum, uploadId, buf) {
      return {
        Body: buf,
        Bucket: bucket,
        Key: dest,
        PartNumber: String(partNum),
        UploadId: uploadId
      }
    }
  }
}

module.exports = OSS
