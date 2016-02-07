'use strict';

const Promise = require('bluebird')
const exec = Promise.promisify(require('child_process').exec)
const fs = Promise.promisifyAll(require('fs'))
const path = require('path')

const chai = require('chai').use(require('chai-fs'))
const expect = chai.expect

const ossSync = require('../')

const tmpDir = require('os').tmpdir()
const repo = 'oss-sync'
const repoUrl = 'https://github.com/mehwww/oss-sync'

const syncOptions = require('./.oss-sync.json')
const repoPath = path.join(tmpDir, repo)

before('Git clone a repo', function () {
  this.timeout(90000)

  return exec(`rm -rf ${repo}`, {cwd: tmpDir})
    .then(() => {
      console.log('Cloning a repoistry...')
      return exec(`git clone --depth=1 --branch=master ${repoUrl} && rm -rf ${repo}/.git`, {cwd: tmpDir})
        .then((result) => { console.log('Complete.\n') })
    })
})

describe('oss-sync', () => {
  let options = {}
  let sync

  before(function () {
    options = Object.assign(options, syncOptions, {
      source: repoPath,
      dest: repo
    })

    sync = ossSync(options)
  })

  it('should initialize correctly', function () {
    this.timeout(60000)
    return sync.exec()
      .then(() => {
        expect(path.join(tmpDir, repo, '.sync')).to.be.a.directory('oss-sync not initialized correctly')
      })
  });
})
