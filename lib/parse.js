exports = module.exports = function parse(gitStatus) {
  var output = gitStatus.trim().split('\n')
  var queue = {
    put: [],
    delete: []
  }
  output.forEach(function (line) {
    var fileinfo = []

    var isModified = line.indexOf('modified') > -1;
    var isNewFile = line.indexOf('new file') > -1;
    var isDeleted = line.indexOf('deleted') > -1;
    var isRenamed = line.indexOf('renamed') > -1;


    if (isModified || isNewFile) {
      fileinfo = line.substr(1).trim().split(':');
      queue.put.push(getFilename(fileinfo[1].trim()))
    }

    if (isDeleted) {
      fileinfo = line.substr(1).trim().split(':');
      queue.delete.push(getFilename(fileinfo[1].trim()))
    }

    if (isRenamed) {
      fileinfo = line.substr(1).trim().split(':');
      var file = fileinfo[1].trim().split(' -> ')
      queue.delete.push(getFilename(file[0]))
      queue.put.push(getFilename(file[1]))
    }

  })
  return queue
}

function getFilename(name) {
  if (name[0] == '"') {
    name = name.trim()
      .substring(1, name.length - 1); //remove double quotes
  }
  name = name.substr(6, name.length - 6 - 7).replace(/\\/g, ''); //remove '/trash','.~trash'
  return name
}