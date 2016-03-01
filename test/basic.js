'use strict'

// Running on OS X

const Promise = require('bluebird')
const path = require('path')
const url = require('url')

const chai = require('chai').use(require('chai-fs'))
const expect = chai.expect

const Sync = require('../')

const syncOptions = require('./.oss-sync.json')
const repoPath = path.resolve('./fixtures/basic')
const host = `http://${syncOptions.bucket}.${url.parse(syncOptions.endpoint).hostname}`

describe('oss-sync', function () {
  const options = Object.assign({}, syncOptions, {
    source: repoPath,
    dest: ''
  })
  const sync = new Sync(options)

  before('Clean', function () {
    return exec('rm -rf .sync').then(() => clearBucket())
  })

  it('should initialize correctly', function () {
    this.timeout(20 * 60 * 1000)
    return sync.exec()
      .then(() => {
        expect(path.join(repoPath, '.sync')).to.be.a.directory('oss-sync not initialized correctly')
      })
  })

  it('should upload correctly', function () {
    this.timeout(20 * 60 * 1000)

    return exec('find . -type f -print | grep -v \"\\\/\\\.\"')
      .then((result) => result.trim().split('\n'))
      .map((file) => {
        return hashBoth(file).spread((ossHash, fileHash) => {
          expect(ossHash).to.equal(fileHash)
        })
      })
  })

  it('should delete the rename file', function () {
    this.timeout(20 * 60 * 1000)
    const origin = 'a-big-image.png'
    const target = 'another-big-image.png'

    return exec(`mv ${origin} ${target}`)
      .then(() => sync.exec())
      .then(() => {
        return hashBoth(target).spread((ossHash, fileHash) => {
          expect(ossHash).to.equal(fileHash)
        })
      })
      .then(() => exec(`mv ${target} ${origin}`))
      .then(() => {
        return exec(`curl -s -o /dev/null -w \"%{http_code}\" "${url.resolve(host, origin)}"`).then((status) => {
          expect(String(status)).to.equal('404')
        })
      })
  })
})

describe('oss-sync incremental mode', function () {
  let options = Object.assign({}, syncOptions, {
    source: repoPath,
    dest: ''
  })
  let sync = new Sync(options)

  before('Clean', function () {
    return exec('rm -rf .sync').then(() => clearBucket())
  })

  it('should not delete the rename file in incremental mode', function () {
    this.timeout(20 * 60 * 1000)
    const origin = 'a-big-image.png'
    const target = 'another-big-image.png'

    return sync.exec()
      .then(() => exec(`mv ${origin} ${target}`))
      .then(() => sync.exec())
      .then(() => {
        return hashBoth(target).spread((ossHash, fileHash) => {
          expect(ossHash).to.equal(fileHash)
        })
      })
      .then(() => {
        return hashBoth(target, origin).spread((ossHash, fileHash) => {
          expect(ossHash).to.equal(fileHash)
        })
      })
      .finally(() => exec(`mv ${target} ${origin}`))
  })
})

after(function () {
  return exec('rm -rf .sync').then(() => clearBucket())
})

function exec (command) {
  return Promise.promisify(require('child_process').exec)(command, {cwd: repoPath})
}

function hashBoth (file) {
  return Promise.all([
    exec(`curl -s "${url.resolve(host, file)}" | md5 -q`),
    exec(`md5 -q "${path.resolve(repoPath, file)}"`)
  ])
}

function clearBucket () {
  const SDK = require('aliyun-sdk')
  const oss = new SDK.OSS({
    accessKeyId: syncOptions.accessKeyId,
    secretAccessKey: syncOptions.secretAccessKey,
    endpoint: syncOptions.endpoint,
    apiVersion: syncOptions.apiVersion || '2013-10-15'
  })

  return getAllObjects()
    .then((list) => deleteObjects(list))

  function getAllObjects () {
    return new Promise((resolve, reject) => {
      oss.listObjects({
        Bucket: syncOptions.bucket
      }, (err, data) => {
        if (err) return reject(err)
        resolve(data.Contents.map((object) => object.Key))
      })
    })
  }

  function deleteObjects (list) {
    if (list.length === 0) return Promise.resolve()

    return new Promise((resolve, reject) => {
      oss.deleteObjects({
        Bucket: syncOptions.bucket,
        Delete: {
          Objects: list.map((key) => ({Key: key})),
          Quiet: true
        }
      }, (err, result) => {
        if (err) return reject(err)
        resolve(result)
      })
    })
  }
}
