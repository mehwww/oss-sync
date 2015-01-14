var chalk = require('chalk');
var ProgressBar = require('progress');

exports.stick = RollingStick;

function RollingStick(file) {
  if (!(this instanceof RollingStick)) {
    return new RollingStick(file);
  }

  this.file = file;
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
  console.log('  ' + this.file + '  ' + chalk.cyan('\u2714'));
}

RollingStick.prototype.failed = function () {
  clearInterval(this.rolling);
  this.stream.clearLine();
  this.stream.cursorTo(0);
  console.log('  ' + this.file + '  ' + chalk.red('\u2718'));
}

RollingStick.prototype.tick = function () {
  this.index = ++this.index % 4;
  this.stream.clearLine();
  this.stream.cursorTo(0);
  this.stream.write('  ' + this.file + '  ' + this.sticks[this.index]);
}

exports.bar = BurningBar;

function BurningBar(file, total) {
  if (!(this instanceof BurningBar)) {
    return new BurningBar(file, total);
  }

  this.bar = new ProgressBar('  ' + file + '  [:bar] :percent ', {
    total: total,
    width: 20,
    clear: true,
    callback: function () {
      console.log('  ' + file + '  ' + chalk.cyan('\u2714'));
    }
  });
}

BurningBar.prototype.tick = function () {
  this.bar.tick()
}




