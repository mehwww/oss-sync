var fs = require('fs');
var path = require('path');

var mime = require('mime');
var debug = require('debug')('sync:oss');
var Promise = require('bluebird');
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

OSS.prototype.deleteMultiObjects = function (queue) {
  var self = this;
  var deleteList = queue.delete;
  var client = self.client;
  var bucket = self.bucket;

  if (deleteList.length === 0) return queue

  deleteList = deleteList.map(function (file) {
    return {Key: path.join(self.dest, file)}
  })

  return new Promise(function (resolve, reject) {
    client.deleteObjects({
      Bucket: bucket,
      Delete: {
        Objects: deleteList,
        Quiet: true
      }
    }, function (err, deleteResult) {
      if (err) return reject(err);
      resolve(deleteResult);
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

OSS.prototype.putMultiObjects = function (queue) {
  var self = this;
  var putList = queue.put;

  if (putList.length === 0) return queue

  return Promise.map(putList, function (file) {
    return self.putBigObject(path.join(self.source, file), path.join(self.dest, file))
  }, {concurrency: 1}).then(function (putMultiResult) {
    debug('putMultiResult:');
    debug(putMultiResult);
    return queue;
  })
}

OSS.prototype.putObject = function (source, dest) {
  var self = this;
  var client = self.client;
  var bucket = self.bucket;
  var rollingStick = stick(source);
  return new Promise(function (resolve, reject) {
    fs.readFile(source, function (err, data) {
      rollingStick.start();
      if (err) return reject(err);
      client.putObject({
        Bucket: bucket,
        Key: dest,
        Body: data,
        AccessControlAllowOrigin: '',
        ContentType: mime.lookup(source),
        CacheControl: 'no-cache', // 参考: http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.9
        ContentDisposition: '', // 参考: http://www.w3.org/Protocols/rfc2616/rfc2616-sec19.html#sec19.5.1
        ContentEncoding: 'utf-8', // 参考: http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.11
        ServerSideEncryption: 'AES256',
        Expires: 0
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

OSS.prototype.putBigObject = function (source, dest) {
  var self = this;
  var client = self.client;
  var bucket = self.bucket;

  var fsize = fs.statSync(source).size;
  var partNum = 0;
  var partSize = 1024 * 1024 * 2;
  var partsTotal = Math.ceil(fsize / partSize);
  if (!process.env.MYDEBUG && !process.env.DEBUG) {
    var burningBar = bar(source, partsTotal);
  }

  var multipartMap = {
    Parts: []
  }

  var uploadPromise = new Promise(function (resolve, reject) {
    client.createMultipartUpload({
      Bucket: bucket,
      Key: dest,
      ContentType: '',
      ContentDisposition: ''
    }, function (mpErr, multipart) {
      if (mpErr) {
        debug('Multipart upload init failed:')
        debug(mpErr)
        reject(mpErr)
      } else {
        debug('Upload ID: %s', multipart.UploadId);
        debug('Start uploading: ', source);
        uploadId = multipart.UploadId;
        resolve(multipart.UploadId);   //resolve upload id and init part number
      }
    })
  })

  //can be concurrent with Promise.join
  for (var i = 1; i <= partsTotal; i++) {
    uploadPromise = uploadPromise
      .then(function (uploadId) {
        return new Promise(function (resolve, reject) {
          var start = partNum * partSize;
          var end = partNum === partsTotal - 1 ? fsize - 1 : (partNum + 1) * partSize - 1;
          debug('start: %s', start);
          debug('end: %s', end);
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
        }).then(function (buf) {
            return [uploadId, buf]
          })
      }).spread(function (uploadId, buf) {
        return new Promise(function (resolve, reject) {
          client.uploadPart(getPartParams(++partNum, uploadId, buf), function (partErr, partData) {
            if (partErr) {
              debug('Upload part error:');
              debug('%s', partErr);
              reject(partErr)
            } else {
              multipartMap.Parts[this.request.params.PartNumber - 1] = {
                ETag: partData.ETag,
                PartNumber: Number(this.request.params.PartNumber)
              }
              debug('Completed part %s', this.request.params.PartNumber);
              debug(partData);
              burningBar && burningBar.tick();
              resolve(uploadId)
            }
          })
        })
      })
  }
  uploadPromise = uploadPromise.then(function (uploadId) {
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
          debug('Upload Complete')
          resolve(completeData)
        }
      })
    })
  })

  return uploadPromise;

  function getPartParams(partNum, uploadId, buf) {
    return {
      Body: buf,
      Bucket: bucket,
      Key: dest,
      PartNumber: String(partNum),
      UploadId: uploadId
    }
  }
}

