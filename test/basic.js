'use strict'

const Promise = require('bluebird')
const exec = Promise.promisify(require('child_process').exec)
const path = require('path')

const chai = require('chai').use(require('chai-fs'))
const expect = chai.expect

const Sync = require('../')

const tmpDir = require('os').tmpdir()
// const repo = 'oss-sync'
// const repoUrl = 'https://github.com/mehwww/oss-sync'

const syncOptions = require('./.oss-sync.json')
const repoPath = path.resolve('./fixtures')
// const repoPath = path.join(tmpDir, repo)

// before('Git clone a repo', function () {
//   this.timeout(90000)
//
//   return exec(`rm -rf ${repo}`, {cwd: tmpDir})
//     .then(() => {
//       console.log('Cloning a repoistry...')
//       return exec(`git clone --depth=1 --branch=master ${repoUrl} && rm -rf ${repo}/.git`, {cwd: tmpDir})
//         .then((result) => { console.log('Complete.\n') })
//     })
// })

before('Clean', function () {
  return exec('rm -rf .sync', {cwd: repoPath})
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
})

before('Clean', function () {
  return exec('rm -rf .sync', {cwd: repoPath})
})
