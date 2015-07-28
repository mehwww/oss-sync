var fs = require('fs');
var path = require('path');

var mime = require('mime');
var debug = require('debug')('sync:oss');
var Promise = require('bluebird');
var chalk = require('chalk');
var SDK = require('aliyun-sdk');

var stick = require('./progress').stick;
var bar = require('./progress').bar;

exports = module.exports = OSS;

function OSS(config, source, dest) {
  this.client = new SDK.OSS({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    endpoint: config.endpoint,
    apiVersion: '2013-10-15'
  });

  this.bucket = config.bucket;
  this.source = source;
  this.dest = dest;
}

OSS.prototype.deleteMultiObjects = function (deleteList) {
  var self = this;
  var client = self.client;
  var bucket = self.bucket;

  if (deleteList.length === 0) return Promise.resolve();

  return Promise.resolve()
    .then(function () {
      console.log();
      console.log('    ' + chalk.red('Delete:'));
      console.log();
      return deleteList.map(function (file) {
        console.log('  ' + path.join(self.source, file));
        return {Key: path.join(self.dest, file)}
      })
    })
    .then(function (deleteObjects) {
      return new Promise(function (resolve, reject) {
        client.deleteObjects({
          Bucket: bucket,
          Delete: {
            Objects: deleteObjects,
            Quiet: true
          }
        }, function (err, deleteResult) {
          if (err) return reject(err);
          resolve(deleteResult);
        })
      })
    })
}

//useless now
OSS.prototype.deleteObject = function (file) {
  var self = this;
  var client = self.client;
  var bucket = self.bucket;
  return new Promise(function (resolve, reject) {
    client.deleteObject({
      Bucket: bucket,
      Key: file
    }, function (err, deleteResult) {
      if (err) return reject(err);
      resolve(deleteResult);
    })
  })
}

OSS.prototype.putMultiObjects = function (putList) {
  var self = this;

  if (putList.length === 0) return Promise.resolve();

  return Promise.resolve()
    .then(function () {
      console.log();
      console.log('    ' + chalk.cyan('Upload:'));
      console.log();
      return putList
    })
    .map(function (file) {
      var source = path.join(self.source, file);
      var dest = path.join(self.dest, file);

      var fsize = fs.statSync(source).size;
      if (fsize > 10 * 1024 * 1024) {
        return self.putBigObject(source, dest, fsize)
      } else {
        return self.putObject(source, dest, fsize)
      }
    }, {concurrency: 1})
    .then(function (putMultiResult) {
      debug('putMultiResult:');
      debug(putMultiResult);
    })
}

OSS.prototype.putObject = function (source, dest, fsize) {
  var self = this;
  var client = self.client;
  var bucket = self.bucket;
  var rollingStick = stick(source, fsize);

  var readFile = Promise.promisify(require("fs").readFile);

  return readFile(source)
    .then(function (data) {
      rollingStick.start();
      return new Promise(function (resolve, reject) {
        client.putObject({
          Bucket: bucket,
          Key: dest,
          Body: data,
          ContentType: mime.lookup(source),
          ServerSideEncryption: 'AES256'
        }, function (err, putResult) {
          if (err) {
            rollingStick.failed();
            return reject(err);
          } else {
            rollingStick.success();
            resolve(putResult);
          }
        })
      })
    })
}

OSS.prototype.putBigObject = function (source, dest, fsize) {
  var self = this;
  var client = self.client;
  var bucket = self.bucket;

  var burningBar;
  var uploadId;
  var partSize = Math.ceil(fsize / 100);
  //part size must between 0.5M and 5M
  partSize = (partSize < 512 * 1024) ? 1024 * 1024 : (partSize > 1024 * 1024 * 5) ? 1024 * 1024 * 5 : partSize
  var partsTotal = Math.ceil(fsize / partSize);

  if (!process.env.MYDEBUG && !process.env.DEBUG) {
    burningBar = bar(source, fsize, partsTotal);
  }

  var multipartMap = {Parts: []};

  function initUpload() {
    return new Promise(function (resolve, reject) {
      client.createMultipartUpload({
        Bucket: bucket,
        Key: dest,
        ContentType: mime.lookup(source)
      }, function (mpErr, multipart) {
        if (mpErr) {
          debug('Multipart upload init failed:')
          debug(mpErr)
          reject(mpErr)
        } else {
          debug('Upload ID: %s', multipart.UploadId);
          debug('Start uploading: %s', source);
          debug('Total parts: %s', partsTotal)
          uploadId = multipart.UploadId;
          resolve(multipart)
        }
      })
    })
  }

  function readPart(partNum) {
    return new Promise(function (resolve, reject) {
      var start = partNum * partSize;
      var end = partNum === partsTotal - 1 ? fsize - 1 : (partNum + 1) * partSize - 1;
      debug('Read part %s   start: %s  end:%s', partNum, start, end);
      var fileReadStream = fs.createReadStream(source, {
        start: start,
        end: end
      });
      var chunks = [];
      var size = 0;

      fileReadStream.on('data', function (chunk) {
        chunks.push(chunk);
        size += chunk.length;
      });
      fileReadStream.on('end', function () {
        resolve(Buffer.concat(chunks, size))
      });
      fileReadStream.on('error', function (err) {
        reject(err)
      });
    })
  }

  function uploadPart(partNum, buf) {
    return new Promise(function (resolve, reject) {
      debug('Start uploading part %s', partNum);
      client.uploadPart(getPartParams(partNum + 1, uploadId, buf), function (partErr, partData) {
        if (partErr) {
          debug('Upload part %s error:', partNum);
          debug('%s', partErr);
          reject(partErr)
        } else {
          multipartMap.Parts[this.request.params.PartNumber - 1] = {
            ETag: partData.ETag,
            PartNumber: Number(this.request.params.PartNumber)
          }
          debug('Completed part %s', this.request.params.PartNumber - 1);
          //debug(partData);
          resolve(uploadId)
        }
      })
    })
  }

  function completeUpload() {
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
          debug('Upload Complete: %s', source)
          resolve(completeData)
        }
      })
    })
  }

  function getPartParams(partNum, uploadId, buf) {
    return {
      Body: buf,
      Bucket: bucket,
      Key: dest,
      PartNumber: String(partNum),
      UploadId: uploadId
    }
  }

  var startTime;

  return Promise.resolve()
    .then(function () {
      startTime = +new Date();
    })
    .then(initUpload)
    .then(function () {
      burningBar && burningBar.render();
      return new Array(partsTotal)
    })
    .map(function (useless, partNum) {
      return Promise.resolve()
        .then(function () {
          return readPart(partNum)
        })
        .then(function (buf) {
          return uploadPart(partNum, buf)
        })
        .then(function () {
          burningBar && burningBar.tick();
        })
    }, {concurrency: 3})
    .then(completeUpload)
    .then(function () {
      debug('Completed upload in %s seconds', (new Date() - startTime) / 1000)
    })

}

