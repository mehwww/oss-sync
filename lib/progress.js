var chalk = require('chalk');
var humanize = require('humanize');
var ProgressBar = require('progress');

exports.stick = RollingStick;

function RollingStick(file, fsize) {
  if (!(this instanceof RollingStick)) {
    return new RollingStick(file, fsize);
  }

  this.file = file;
  this.fsize = fsize;
  this.stream = process.stderr;
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
  this.stream.clearLine();
  this.stream.cursorTo(0);
  console.log('  ' + this.file + '  ' + humanize.filesize(this.fsize) + '  ' + chalk.cyan('\u2714'));
}

RollingStick.prototype.failed = function () {
  clearInterval(this.rolling);
  this.stream.clearLine();
  this.stream.cursorTo(0);
  console.log('  ' + this.file + '  ' + humanize.filesize(this.fsize) + '  ' + chalk.red('\u2718'));
}

RollingStick.prototype.tick = function () {
  this.index = ++this.index % 4;
  this.stream.clearLine();
  this.stream.cursorTo(0);
  this.stream.write('  ' + this.file + '  ' + humanize.filesize(this.fsize) + '  ' + this.sticks[this.index]);
}

exports.bar = BurningBar;

function BurningBar(file, fsize, total) {
  if (!(this instanceof BurningBar)) {
    return new BurningBar(file, fsize, total);
  }

  this.bar = new ProgressBar('  ' + file + '  ' + humanize.filesize(fsize) + '  [:bar] :percent ', {
    total: total,
    width: 20,
    clear: true,
    callback: function () {
      console.log('  ' + file + '  ' + humanize.filesize(fsize) + '  ' + chalk.cyan('\u2714'));
    }
  });
}

BurningBar.prototype.tick = function () {
  this.bar.tick();
}

BurningBar.prototype.render = function () {
  this.bar.render();
}



