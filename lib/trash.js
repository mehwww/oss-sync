'use strict'

const Promise = require('bluebird')
const path = require('path')
const crypto = require('crypto')
const ncp = require('ncp').ncp

ncp.limit = 16

function generateTrash (source, options) {
  const incrementalMode = options.incrementalMode

  return new Promise((resolve, reject) => {
    ncp(source, path.join(source, '.sync', 'trash'), {
      filter: (name) => !path.basename(name).match(/^\./gi),
      rename: (name) => name + '.~trash',
      modified: incrementalMode,
      clobber: !incrementalMode,
      transform: hashFile
    }, function (err) {
      if (err) reject(err)
      resolve()
    })

    function hashFile (readStream, writeStream, file) {
      var shasum = crypto.createHash('md5')
      var hash = ''
      readStream.on('data', function (data) {
        shasum.update(data)
      })
      readStream.on('end', function () {
        hash = shasum.digest('hex')
        writeStream.write(hash)
        writeStream.end('\n')
      })
    }
  })
}

module.exports = generateTrash
