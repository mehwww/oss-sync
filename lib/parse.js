'use strict'

const EOL = require('os').EOL

function parse (status) {
  let output = status.trim().split(EOL)
  let queue = {put: [], delete: []}
  output.forEach((line) => {
    let isModified = line.indexOf('modified') > -1
    let isNewFile = line.indexOf('new file') > -1
    let isDeleted = line.indexOf('deleted') > -1
    let isRenamed = line.indexOf('renamed') > -1

    let info = line.substr(1).trim().split(':')[1]

    if (isModified || isNewFile) {
      queue.put.push(getFilename(info.trim()))
    }

    if (isDeleted) {
      queue.delete.push(getFilename(info.trim()))
    }

    if (isRenamed) {
      let files = info.trim().split(' -> ')
      queue.delete.push(getFilename(files[0]))
      queue.put.push(getFilename(files[1]))
    }
  })

  return queue
}

function getFilename (name) {
  name = name.replace(/^"|"$/g, '')
    .replace(/^trash\/|\.~trash$/g, '')
  return name
}


module.exports = parse
module.exports._getFilename = getFilename
