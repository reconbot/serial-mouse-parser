import { Transform } from 'stream'
import Debug from 'debug'
const debug = Debug('serialport/mouse-parser')

const StartByteMarkerByte = 0b01000000
const LeftMouseButtonByte = 0b00100000
const RightMouseButtonByte = 0b00010000

const isStart = byte => byte & StartByteMarkerByte

const DEFAULT_STATE = Object.freeze({
  leftMouseButton: false,
  rightMouseButton: false,
})

/**
 * A transform stream that parses microsoft serial mouse data.
 * @extends Transform
 * @param {Object} options options object
 * @example
 */
export class MouseParserStream extends Transform {
  private buffer: number[]
  private state: Readonly<{ leftMouseButton: boolean; rightMouseButton: boolean }>
  constructor(options = {}) {
    super({
      readableObjectMode: true,
      ...options,
    })
    this.buffer = []
    this.state = DEFAULT_STATE
  }

  _transform(chunk: Buffer, encoding, cb) {
    const data = [...this.buffer, ...Array.from(chunk)]
    debug('processing', data)
    let packet: number[] = []
    for (const byte of data) {
      if (isStart(byte) && packet.length > 0) {
        this._emitEvent(packet)
        packet = []
      }
      packet.push(byte)
      if (packet.length === 3) {
        this._emitEvent(packet)
        packet = []
      }
    }

    debug('buffering', packet)
    this.buffer = packet
    cb()
  }

  _flush(cb) {
    this._emitEvent(this.buffer)
    this.buffer = []
    cb()
  }

  /**
   * Converts a 3 byte packet into events
   * @param {[number, number number]} packet]
   *
   * Data layout
   *           D7      D6      D5      D4      D3      D2      D1      D0
   *
   *   Byte 1  X       1       LB      RB      Y7      Y6      X7      X6
   *   Byte 2  X       0       X5      X4      X3      X2      X1      X0
   *   Byte 3  X       0       Y5      Y4      Y3      Y2      Y1      Y0
   *
   *   LB is the state of the left button (1 means down)
   *   RB is the state of the right button (1 means down)
   *   X7-X0 movement in X direction since last packet (signed byte)
   *   Y7-Y0 movement in Y direction since last packet (signed byte)
   *
   */
  private _emitEvent(packet) {
    debug('emitting packet', packet)
    if (packet.length !== 3) {
      debug(`bad packet length ${packet}`)
      return
    }

    const leftMouseButton = Boolean(packet[0] & LeftMouseButtonByte)
    const rightMouseButton = Boolean(packet[0] & RightMouseButtonByte)

    const events: Array<{ type: string; [key: string]: any }> = []
    if (this.state.leftMouseButton !== leftMouseButton) {
      debug('left mouse click', leftMouseButton)
      events.push({ type: 'onClick' })
    }
    if (this.state.rightMouseButton !== rightMouseButton) {
      debug('right mouse click', rightMouseButton)
      events.push({ type: 'onRightClick' })
    }

    if (events.length) {
      this.state = Object.freeze({ leftMouseButton, rightMouseButton })
      debug('updating state', this.state)
    }

    // xy events
    const xBuffer = Buffer.from([((packet[0] & 0b0000011) << 6) | (packet[1] & 0b00111111)])
    const x = xBuffer.readInt8(0)
    const yBuffer = Buffer.from([((packet[0] & 0b0001100) << 4) | (packet[2] & 0b00111111)])
    const y = yBuffer.readInt8(0)
    if (x || y) {
      events.push({ type: 'move', x, y })
    }
    for (const event of events) {
      this.push({ ...event, state: this.state })
    }
  }
}
