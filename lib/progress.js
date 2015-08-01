/**
 * Heavily borrow from https://github.com/tj/node-progress
 */

exports = module.exports = ProgressBar;

function ProgressBar(format, options) {
  if (!(this instanceof ProgressBar)) {
    return new ProgressBar(format, options);
  }

  options = options || {};

  this.stream = process.stderr;
  this.format = format;
  this.current = 0;
  this.total = options.total || 0;
  this.width = options.width || 20;
  this.clear = options.clear !== false;
  this.renderThrottle = options.renderThrottle !== 0
    ? (options.renderThrottle || 16)
    : 0;
  this.tokens = {};
  this.lastDraw = '';
  this.renderThrottleTimeout = null;
  this.automateInterval = null;
}

ProgressBar.prototype.tick = function (tokens) {
  this.current += 1;
  if (tokens) this.tokens = tokens;
  if (!this.renderThrottleTimeout) {
    this.renderThrottleTimeout = setTimeout(this.render.bind(this), this.renderThrottle);
  }
}

ProgressBar.prototype.render = function (tokens) {
  clearTimeout(this.renderThrottleTimeout);
  this.renderThrottleTimeout = null;

  if (!this.stream.isTTY) return;

  if (tokens) this.tokens = tokens;

  var chars = {
    bar: ['=', '-'],
    clapping: ['o( ^q^)ノ', 'o( ^q^)__'],
    stick: ['\\', '|', '/', '-']
  };

  var line = this.format
    .replace(':current', this.current)
    .replace(':total', this.total)
    .replace(':clapping', chars.clapping[this.current % chars.clapping.length])
    .replace(':stick', chars.stick[this.current % chars.stick.length]);

  if (this.tokens) for (var key in this.tokens) line = line.replace(':' + key, this.tokens[key]);

  var percent = '';
  var bar = '';

  // "Bar"
  if (!!this.total) {
    var ratio = Math.min(Math.max(this.current / this.total, 0), 1);
    var availableSpace = Math.max(0, this.stream.columns - line.replace(':bar', '').length);
    var width = Math.min(this.width, availableSpace);
    var completeLength = Math.round(width * ratio);
    var complete = Array(completeLength + 1).join(chars.bar[0]);
    var incomplete = Array(width - completeLength + 1).join(chars.bar[1]);

    percent = (ratio * 100).toFixed(0) + '%';
    bar = complete + incomplete;
  }

  line = line
    .replace(':percent', percent)
    .replace(':bar', bar);

  if (this.stream.columns < (line.length + 10)) {
    line = line.substr(0, this.stream.columns - 10) + '..';
  }

  if (this.lastDraw !== line) {
    this.stream.cursorTo(0);
    this.stream.write(line);
    this.stream.clearLine(1);
    this.lastDraw = line;
  }
}

ProgressBar.prototype.automate = function (interval, tokens) {
  if ('object' === typeof interval) {
    tokens = interval;
    interval = 200;
  }
  if (!this.automateInterval) {
    clearTimeout(this.renderThrottleTimeout);
    this.automateInterval = setInterval(this.tick.bind(this, tokens), interval);
  }
}

ProgressBar.prototype.end = function () {
  if (this.clear) {
    this.stream.clearLine();
    this.stream.cursorTo(0);
  } else {
    this.stream.write('\n');
  }
  clearTimeout(this.renderThrottleTimeout);
  clearInterval(this.automateInterval);
}