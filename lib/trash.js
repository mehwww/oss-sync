var path = require('path');
var crypto = require('crypto');

var ncp = require('ncp').ncp;
var Promise = require('bluebird');
var chalk = require('chalk');
var debug = require('debug')('sync:trash');

var progress = require('./progress');

ncp.limit = 16;

exports = module.exports = generateTrash;

function generateTrash(source, options) {
  var bar = progress('    ' + chalk.cyan('Building Trash:') + ':clapping :filename', {
    //renderThrottle: 100,
  });
  var tokens = {filename: ''};
  return new Promise(function (resolve, reject) {
    var modified = options.modified;
    var clobber = options.clobber;

    console.log();
    ncp(source, path.join(source, '.sync', 'trash'), {
      filter: function (name) {
        var isFiltered = (path.basename(name)[0] !== '.');
        debug('file name: %s %s', name, isFiltered);
        if (isFiltered) return true;
      },
      rename: function (name) {
        return name + '.~trash'
      },
      modified: modified,
      clobber: clobber,
      transform: hashFile
    }, function (err) {
      bar.end();
      console.log('    ' + chalk.cyan('Building Trash:') + '  ' + chalk.cyan('\u2714'));
      if (err) reject(err);
      resolve();
    })

    function hashFile(readStream, writeStream, file) {
      tokens.filename = path.basename(file.name);
      var shasum = crypto.createHash('sha1');
      var hash = '';
      writeStream.once('finish', function () {
        bar.tick(tokens);
      });
      readStream.on('data', function (data) {
        shasum.update(data)
      });
      readStream.on('end', function () {
        hash = shasum.digest('hex');
        writeStream.write(hash);
        writeStream.end('\n');
      })
    }

  })
}


