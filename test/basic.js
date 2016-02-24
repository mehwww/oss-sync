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

before('Clean', function () {
  return exec('rm -rf .sync')
})

describe('oss-sync', function () {
  let options = {}
  let sync

  before(function () {
    options = Object.assign(options, syncOptions, {
      source: repoPath,
      dest: ''
    })

    sync = new Sync(options)
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

after('Clean', function () {
  return exec('rm -rf .sync', {cwd: repoPath})
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
