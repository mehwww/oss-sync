'use strict'

const Promise = require('bluebird')
const path = require('path')
const crypto = require('crypto')
const ncp = require('ncp').ncp
const chalk = require('chalk')
const print = require('./print')

ncp.limit = 16

function generateTrash (source, options) {
  const bar = new print.Bar(`    ${chalk.cyan('Building Trash:')} :clapping :filename`)
  const tokens = {filename: ''}

  return new Promise(function (resolve, reject) {
    let modified = options.modified
    let clobber = options.clobber

    ncp(source, path.join(source, '.sync', 'trash'), {
      filter: function (name) {
        return !path.basename(name).match(/^\./gi)
        // var isFiltered = (path.basename(name)[0] !== '.')
        // if (isFiltered) return true
      },
      rename: function (name) {
        return name + '.~trash'
      },
      modified: modified,
      clobber: clobber,
      transform: hashFile
    }, function (err) {
      bar.end()
      console.log('    ' + chalk.cyan('Building Trash:') + '  ' + chalk.cyan('\u2714'))
      if (err) reject(err)
      resolve()
    })

    function hashFile (readStream, writeStream, file) {
      tokens.filename = path.basename(file.name)
      var shasum = crypto.createHash('md5')
      var hash = ''
      writeStream.once('finish', function () {
        bar.tick(tokens)
      })
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
