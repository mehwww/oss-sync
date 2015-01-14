var chalk = require('chalk');
//Only a rolling stick now
//exports = module.exports = ProgressBar;
//
//function ProgressBar() {
//  if (!(this instanceof ProgressBar)) {
//    return new ProgressBar();
//  }
//
//  this.stream = process.stderr;
//  this.sticks = ['\\', '|', '/', '-'];
//  this.index = 0;
//}
//
//ProgressBar.prototype.__proto__ = EventEmitter.prototype;
//
//ProgressBar.prototype.tick = function () {
//  this.index = ++this.index % 4
//  this.render();
//}
//
//ProgressBar.prototype.render = function () {
//  this.stream.clearLine();
//  this.stream.cursorTo(0);
//  this.stream.write(this.sticks[this.index]);
//}
//
//ProgressBar.prototype.terminate = function () {
//  this.stream.clearLine();
//  this.stream.cursorTo(0);
//}

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





