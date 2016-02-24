'use strict'

class Bar {
  constructor (options) {
    options = options || {}
    this.width = options.width || 20
    this.current = 0
    this.total = options.total || 0
    this.renderThrottle = options.renderThrottle !== 0
      ? (options.renderThrottle || 16)
      : 0
    this.tokens = {}
    this.lastDraw = ''
    this.renderThrottleTimeout = null
    this.stream = process.stderr
  }

  tick (line, params) {
    if (!this.renderThrottleTimeout) {
      this.renderThrottleTimeout = setTimeout(this.render.bind(this, line, params), this.renderThrottle)
    }
  }

  render (line, params) {
    const self = this
    if (!self.stream.isTTY) return

    clearTimeout(self.renderThrottleTimeout)
    self.renderThrottleTimeout = null

    const total = params.total ? self.total = params.total : self.total
    const current = params.current ? self.current = params.current : self.current

    const bars = ['=', '-']

    if (total) {
      const ratio = Math.min(Math.max(current / total, 0), 1)
      const percent = `${(ratio * 100).toFixed(0)}%`
      const completeLength = Math.round(self.width * ratio)
      const complete = bars[0].repeat(completeLength)
      const incomplete = bars[1].repeat(self.width - completeLength)
      const bar = complete + incomplete
      line = line
        .replace(':percent', percent)
        .replace(':bar', bar)
    } else {
      line = line
        .replace(':percent', '')
        .replace(':bar', '')
    }

    if (this.lastDraw !== line) {
      this.stream.cursorTo(0)
      this.stream.write(line)
      this.stream.clearLine(1)
      this.lastDraw = line
    }
  }

  end () {
    if (!this.stream.isTTY) return
    this.stream.write('\n')
    clearTimeout(this.renderThrottleTimeout)
  }
}

exports.Bar = Bar
