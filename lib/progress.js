var EventEmitter = require('events');

//Only a rolling stick now
exports = module.exports = ProgressBar;

function ProgressBar() {
  if (!(this instanceof ProgressBar)) {
    return new ProgressBar();
  }

  this.stream = process.stderr;
  this.sticks = ['\\', '|', '/', '-'];
  this.index = 0;
}

ProgressBar.prototype.__proto__ = EventEmitter.prototype;

ProgressBar.prototype.tick = function () {
  this.index = ++this.index % 4
  this.render();
}

ProgressBar.prototype.render = function () {
  this.stream.clearLine();
  this.stream.cursorTo(0);
  this.stream.write(this.sticks[this.index]);
}

ProgressBar.prototype.terminate = function () {
  this.stream.clearLine();
  this.stream.cursorTo(0);
}




