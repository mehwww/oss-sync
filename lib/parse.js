exports = module.exports = parse

function parse(gitStatus) {
  var output = gitStatus.trim().split('\n')
  var queue = {
    put: [],
    delete: []
  }
  output.forEach(function (line) {
    var isModified = line.indexOf('modified') > -1
    var isNewFile = line.indexOf('new file') > -1
    var isDeleted = line.indexOf('deleted') > -1
    var isRenamed = line.indexOf('renamed') > -1

    var info = line.substr(1).trim().split(':')

    if (isModified || isNewFile) {
      queue.put.push(getFilename(info[1].trim()))
    }

    if (isDeleted) {
      queue.delete.push(getFilename(info[1].trim()))
    }

    if (isRenamed) {
      var files = info[1].trim().split(' -> ')
      queue.delete.push(getFilename(files[0]))
      queue.put.push(getFilename(files[1]))
    }

  })
  return queue
}

function getFilename(name) {
  //remove double quotes
  if (name[0] == '"') {
    name = name.trim()
      .substring(1, name.length - 1)
  }
  //remove 'trash/','.~trash'
  name = name.substr(6, name.length - 6 - 7).replace(/\\/g, '')
  return name
}