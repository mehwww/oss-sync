var fs = require('fs');
var path = require('path');

var mime = require('mime');
var async = require('async');
var SDK = require('aliyun-sdk');

exports = module.exports = OSS;

function OSS(config, source, dest) {
  if (!(this instanceof OSS)) {
    return new OSS(config, source, dest);
  }

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


OSS.prototype.putObject = function (source, dest, cb) {
  var self = this;
  var client = self.client;
  var bucket = self.bucket;
  fs.readFile(source, function (err, data) {
    if (err) return cb(err)
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
      Expires: 60
    }, cb)
  })
}

OSS.prototype.deleteObject = function (file, cb) {
  var self = this;
  var client = self.client;
  var bucket = self.bucket;
  client.deleteObject({
    Bucket: bucket,
    Key: file
  }, cb)
}

OSS.prototype.deleteMultiObjects = function (files, cb) {
  var self = this;
  async.map(files, function (file, callback) {
    self.deleteObject(path.join(self.dest, file), callback)
  }, function (err, deleteResults) {
    cb(err, deleteResults)
  })
}

OSS.prototype.putMultiObjects = function (files, cb) {
  var self = this;
  async.map(files, function (file, callback) {
    self.putObject(path.join(self.source, file), path.join(self.dest, file), callback)
  }, function (err, putResults) {
    cb(err, putResults)
  })
}


