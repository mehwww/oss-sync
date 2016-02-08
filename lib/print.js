'use strict'

const wcwidth = require('wcwidth')

function title (string) {
  console.log()
  console.log('    ' + string)
  console.log()
}

function line (string, options) {
  options = options || {}
  if (options.short) {
    return console.log(cutShort('  ' + string))
  }
  console.log('  ' + string)
}

class Bar {
  constructor (format, options) {
    options = options || {}
    this.format = format
    this.current = 0
    this.total = options.total || 0
    this.width = options.width || 20
    this.clear = options.clear !== false
    this.renderThrottle = options.renderThrottle !== 0
      ? (options.renderThrottle || 16)
      : 0
    this.tokens = {}
    this.lastDraw = ''
    this.renderThrottleTimeout = null
    this.automateInterval = null
    this.stream = process.stderr
  }

  tick (tokens) {
    this.current += 1
    if (tokens) this.tokens = tokens
    if (!this.renderThrottleTimeout) {
      this.renderThrottleTimeout = setTimeout(this.render.bind(this), this.renderThrottle)
    }
    return this
  }

  automate (interval, tokens) {
    if (typeof interval === 'object') {
      tokens = interval
      interval = 200
    }
    if (!this.automateInterval) {
      clearTimeout(this.renderThrottleTimeout)
      this.automateInterval = setInterval(this.tick.bind(this, tokens), interval)
    }
    return this
  }

  render (tokens) {
    const self = this
    if (!self.stream.isTTY) return
    if (tokens) self.tokens = tokens

    clearTimeout(self.renderThrottleTimeout)
    self.renderThrottleTimeout = null

    const chars = {
      bar: ['=', '-'],
      clapping: ['o( ^q^)ノ', 'o( ^q^)__'],
      stick: ['\\', '|', '/', '-']
    }

    let line = self.format
      .replace(':current', self.current)
      .replace(':total', self.total)
      .replace(':clapping', chars.clapping[self.current % chars.clapping.length])
      .replace(':stick', chars.stick[self.current % chars.stick.length])

    if (self.tokens) for (let key in self.tokens) line = line.replace(':' + key, self.tokens[key])

    if (self.total) {
      let ratio = Math.min(Math.max(self.current / self.total, 0), 1)
      let percent = `${(ratio * 100).toFixed(0)}%`
      let completeLength = Math.round(self.width * ratio)
      let complete = chars.bar[0].repeat(completeLength)
      let incomplete = chars.bar[1].repeat(self.width - completeLength)
      let bar = complete + incomplete
      line = line
        .replace(':percent', percent)
        .replace(':bar', bar)
    } else {
      line = line
        .replace(':percent', '')
        .replace(':bar', '')
    }

    line = cutShort(line)

    if (this.lastDraw !== line) {
      this.stream.cursorTo(0)
      this.stream.write(line)
      this.stream.clearLine(1)
      this.lastDraw = line
    }
    return this
  }

  end () {
    if (this.clear) {
      this.stream.clearLine()
      this.stream.cursorTo(0)
    } else {
      this.stream.write('\n')
    }
    clearTimeout(this.renderThrottleTimeout)
    clearInterval(this.automateInterval)
    return this
  }
}

// TODO: Strictly fit column width
function cutShort (string) {
  // https://github.com/chalk/ansi-regex/blob/master/index.js
  const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g
  let columnsOverflow = wcwidth(string.replace(ansiRegex, '')) - process.stdout.columns
  if (columnsOverflow <= 0) return string
  let headWidth = 0
  let cutCount = 0
  return string.split('').map((value, index) => {
    if (headWidth < 12) {
      headWidth += wcwidth(value)
      return value
    }
    if (cutCount < columnsOverflow) {
      cutCount += wcwidth(value)
      return ''
    }
    if (cutCount < columnsOverflow + 3) {
      cutCount += wcwidth(value)
      return '.'.repeat(wcwidth(value))
    }
    return value
  }).join('')
}


exports.Bar = Bar
exports.line = line
exports.title = title
exports._cutShort = cutShort
