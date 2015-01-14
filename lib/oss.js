var fs = require('fs');
var path = require('path');

var mime = require('mime');
var debug = require('debug')('sync:oss');
var Promise = require('bluebird');
var SDK = require('aliyun-sdk');

exports = module.exports = OSS;

function OSS(config, source, dest) {
  this.client = new SDK.OSS({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    endpoint: config.endpoint,
    apiVersion: '2013-10-15'
  })

  this.bucket = config.bucket;
  this.source = source;
  this.dest = dest;
}

OSS.prototype.putObject = function (source, dest) {
  var self = this;
  var client = self.client;
  var bucket = self.bucket;
  return new Promise(function (resolve, reject) {
    fs.readFile(source, function (err, data) {
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
        if (err) return reject(err);
        resolve(putResult);
      })
    })
  })
}

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
    return self.putObject(path.join(self.source, file), path.join(self.dest, file))
  }, {concurrency: 1}).then(function (putMultiResult) {
    debug('putMultiResult:');
    debug(putMultiResult);
    return queue;
  })
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