var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var ncp = require('ncp').ncp;
var Promise = require('bluebird');
var debug = require('debug')('sync:trash');

ncp.limit = 16;

exports = module.exports = generateTrash;

//function generateTrash(source, done) {
//  ncp(source, path.join(source, '.sync', 'trash'), {
//    filter: function (name) {
//      debug('file name %s', name)
//      if (path.basename(name)[0] !== '.') return true;
//    },
//    rename: function (name) {
//      return name + '.~trash'
//    },
//    modified: false,
//    transform: hashFile
//  }, function (err) {
//    //TODO:Don't know why, maybe some IO issues
//    setTimeout(function () {
//      done(err)
//    }, 100)
//  })
//}

function generateTrash(source) {
  return new Promise(function (resolve, reject) {
    ncp(source, path.join(source, '.sync', 'trash'), {
      filter: function (name) {
        var isFiltered = (path.basename(name)[0] !== '.')
        debug('file name %s %s', name, isFiltered);
        if (isFiltered) return true;
      },
      rename: function (name) {
        return name + '.~trash'
      },
      modified: false,
      transform: hashFile
    }, function (err) {
      if (err) reject(err);
      resolve();
    })
  })
}


function hashFile(readStream, writeStream) {
  var shasum = crypto.createHash('sha1');
  var hash = '';
  readStream.on('data', function (data) {
    shasum.update(data)
  })
  readStream.on('end', function () {
    hash = shasum.digest('hex');
    writeStream.write(hash);
    writeStream.end('\n');
  })
}
