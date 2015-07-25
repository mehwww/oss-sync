var chalk = require('chalk');
var filesize = require('filesize');
var ProgressBar = require('progress');

exports = module.exports = {
  stick: RollingStick,
  bar: BurningBar
};

function RollingStick(file, fsize) {
  if (!(this instanceof RollingStick)) {
    return new RollingStick(file, fsize);
  }

  this.file = file;
  this.fsize = fsize;
  this.stream = process.stderr;
  this.width = process.stderr.columns;
  this.sticks = ['\\', '|', '/', '-'];
  this.index = 0;
}

RollingStick.prototype.start = function () {
  var self = this;
  self.rolling = setInterval(function () {
    self.tick()
  }, 100);
}

RollingStick.prototype.success = function () {
  clearInterval(this.rolling);
  if (this.stream.clearLine) {
    this.stream.clearLine();
    this.stream.cursorTo(0);
  }
  console.log('  ' + this.file + '  ' + filesize(this.fsize) + '  ' + chalk.cyan('\u2714'));
}

RollingStick.prototype.failed = function () {
  clearInterval(this.rolling);
  if (this.stream.clearLine) {
    this.stream.clearLine();
    this.stream.cursorTo(0);
  }
  console.log('  ' + this.file + '  ' + filesize(this.fsize) + '  ' + chalk.red('\u2718'));
}

RollingStick.prototype.tick = function () {
  if (!this.stream.clearLine) return;
  this.index = ++this.index % 4;
  this.stream.clearLine();
  this.stream.cursorTo(0);
  var line = '  ' + this.file + '  ' + filesize(this.fsize) + '  ' + this.sticks[this.index];
  if (line.length > this.width) {
    line = line.slice(line.length - this.width + 15)
    line = '  ' + chalk.inverse('..') + ' ' + line;
  }
  this.stream.write(line);
}

function BurningBar(file, fsize, total) {
  if (!(this instanceof BurningBar)) {
    return new BurningBar(file, fsize, total);
  }

  this.bar = new ProgressBar('  ' + file + '  ' + filesize(fsize) + '  [:bar] :percent ', {
    total: total,
    width: 20,
    clear: true,
    callback: function () {
      console.log('  ' + file + '  ' + filesize(fsize) + '  ' + chalk.cyan('\u2714'));
    }
  });
}

BurningBar.prototype.tick = function () {
  this.bar.tick();
}

BurningBar.prototype.render = function () {
  this.bar.render();
}

BurningBar.prototype.failed = function () {
  this.bar.terminate();
}



