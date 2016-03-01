'use strict'

const Promise = require('bluebird')
const path = require('path')
const EventEmitter = require('events')
const mime = require('mime')
const SDK = require('aliyun-sdk')

class OSS extends EventEmitter {
  constructor (options) {
    super()
    this.client = new SDK.OSS({
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
      endpoint: options.endpoint,
      apiVersion: options.apiVersion || '2013-10-15'
    })
    this.bucket = options.bucket
    this.dest = options.dest
    this.headers = options.headers || {}
  }

  deleteMultipleObjects (list) {
    const self = this
    const bucket = self.bucket
    const dest = self.dest

    if (list.length === 0) return Promise.resolve()

    return new Promise((resolve, reject) => {
      self.client.deleteObjects({
        Bucket: bucket,
        Delete: {
          Objects: list.map((file) => ({Key: path.join(dest, file)})),
          Quiet: true
        }
      }, (err, result) => {
        if (err) return reject(err)
        resolve(result)
      })
    })
  }

  createMultipartUpload (params) {
    const self = this
    const bucket = self.bucket
    const dest = self.dest
    const headers = self.headers

    let options = {
      Bucket: bucket,
      Key: path.join(dest, params.file),
      ContentType: mime.lookup(params.file)
    }
    headers['ContentEncoding'] && (options['ContentEncoding'] = headers['ContentEncoding'])
    headers['CacheControl'] && (options['CacheControl'] = headers['CacheControl'])
    headers['ContentDisposition'] && (options['ContentDisposition'] = headers['ContentDisposition'])
    headers['ContentLanguage'] && (options['ContentLanguage'] = headers['ContentLanguage'])
    headers['Expires'] && (options['Expires'] = new Date(headers['Expires']))
    headers['Metadata'] && typeof headers['Metadata'] === 'object' && (options['Metadata'] = headers['Metadata'])

    return new Promise((resolve, reject) => {
      self.client.createMultipartUpload(options, (err, result) => {
        if (err) return reject(err)
        resolve(result)
      })
    })
  }

  uploadPart (buf, params) {
    const self = this
    const bucket = self.bucket
    const dest = self.dest
    const bufLength = buf.length
    return new Promise((resolve, reject) => {
      self.client.uploadPart({
        Body: buf,
        Bucket: bucket,
        Key: path.join(dest, params.file),
        PartNumber: String(params.partNum),
        UploadId: params.uploadId
      }, (err, result) => {
        if (err) return reject(err)
        self.emit('uploadProgress', bufLength)
        resolve({
          ETag: result.ETag,
          PartNumber: Number(params.partNum)
        })
      })
    })
  }

  completeMultipartUpload (params) {
    const self = this
    const bucket = self.bucket
    const dest = self.dest

    return new Promise((resolve, reject) => {
      self.client.completeMultipartUpload({
        Bucket: bucket,
        Key: path.join(dest, params.file),
        CompleteMultipartUpload: params.multipartMap,
        UploadId: params.uploadId
      }, (err, result) => {
        if (err) return reject(err)
        resolve(result)
      })
    })
  }

  abortMultipartUpload (params) {
    const self = this
    const bucket = self.bucket
    const dest = self.dest

    return new Promise((resolve, reject) => {
      self.client.abortMultipartUpload({
        Bucket: bucket,
        Key: path.join(dest, params.file),
        UploadId: params.uploadId
      }, (err, result) => {
        if (err) return reject(err)
        resolve(result)
      })
    })
  }

  putObject (buf, params) {
    const self = this
    const bucket = self.bucket
    const dest = self.dest
    const bufLength = buf.length
    const headers = params.headers || {}

    let options = {
      Bucket: bucket,
      Key: path.join(dest, params.file),
      Body: buf,
      ContentType: mime.lookup(params.file)
    }
    headers['ContentEncoding'] && (options['ContentEncoding'] = headers['ContentEncoding'])
    headers['CacheControl'] && (options['CacheControl'] = headers['CacheControl'])
    headers['ContentDisposition'] && (options['ContentDisposition'] = headers['ContentDisposition'])
    headers['ContentLanguage'] && (options['ContentLanguage'] = headers['ContentLanguage'])
    headers['Expires'] && (options['Expires'] = new Date(headers['Expires']))
    headers['Metadata'] && typeof headers['Metadata'] === 'object' && (options['Metadata'] = headers['Metadata'])

    return new Promise(function (resolve, reject) {
      self.client.putObject(options, function (err, putResult) {
        if (err) return reject(err)
        self.emit('uploadProgress', bufLength)
        resolve(putResult)
      })
    })
  }
}

module.exports = OSS
