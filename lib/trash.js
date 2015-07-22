var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var ncp = require('ncp').ncp;
var Promise = require('bluebird');
var chalk = require('chalk');
var debug = require('debug')('sync:trash');

var stick = require('./progress').stick;

ncp.limit = 16;

exports = module.exports = generateTrash;

function generateTrash(source) {
  return new Promise(function (resolve, reject) {
    console.log();
    console.log('    ' + chalk.cyan('Building sync list:'));
    console.log();
    var rollingStick = stick(source, fs.statSync(source).size);
    rollingStick.start();

    ncp(source, path.join(source, '.sync', 'trash'), {
      filter: function (name) {
        var isFiltered = (path.basename(name)[0] !== '.')
        debug('file name %s %s', name, isFiltered);
        if (isFiltered) return true;
      },
      rename: function (name) {
        return name + '.~trash'
      },
      clobber: false,
      modified: true,
      transform: hashFile
    }, function (err) {
      if (err) {
        rollingStick.failed();
        console.log("Error:" + chalk.red(err));
        reject(err);
      }
      else {
        rollingStick.success();
        resolve();
      }
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
