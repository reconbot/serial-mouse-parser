import { Transform } from 'stream'
import Debug from 'debug'
const debug = Debug('mouse-parser')

const StartByteMarkerByte = 0b01000000
const LeftMouseButtonByte = 0b00100000
const RightMouseButtonByte = 0b00010000

const isStart = (byte: number) => byte & StartByteMarkerByte

async function* mousePacketizer(serialport: AsyncIterable<Buffer>) {
  let packet: number[] = []
  for await (const data of serialport) {
    for (const byte of data) {
      if (isStart(byte) && packet.length > 0) {
        yield packet
        packet = []
      }
      packet.push(byte)
      if (packet.length === 3) {
        yield packet
        packet = []
      }
    }
  }
  debug('mousePacketizer', 'port closed? yielding final packet if any', packet)
  if (packet.length) {
    yield packet
  }
}

/**
 * An async iterator that parses microsoft serial mouse data.
 */

export async function* mousePacketParser(packets: AsyncIterable<number[]>) {
  let state = Object.freeze({
    leftMouseButton: false,
    rightMouseButton: false,
  })

  for await (const packet of packets) {
    debug('mousePacketParser', 'parsing packet', packet)
    if (packet.length !== 3) {
      debug(`bad packet length ${packet}`)
      continue
    }
    const leftMouseButton = Boolean(packet[0] & LeftMouseButtonByte)
    const rightMouseButton = Boolean(packet[0] & RightMouseButtonByte)

    const events: Array<{ type: string } | { type: 'move'; x: number; y: number }> = []
    if (state.leftMouseButton !== leftMouseButton) {
      debug('left mouse change', leftMouseButton)
      if (leftMouseButton) {
        events.push({ type: 'mouseDown' })
      } else {
        events.push({ type: 'mouseUp' })
      }
    }
    if (state.rightMouseButton !== rightMouseButton) {
      debug('right mouse change', rightMouseButton)
      if (rightMouseButton) {
        events.push({ type: 'rightMouseDown' })
      } else {
        events.push({ type: 'rightMouseUp' })
      }
    }

    if (events.length) {
      state = Object.freeze({ leftMouseButton, rightMouseButton })
      debug('updating state', state)
    }

    // xy events
    const xBuffer = Buffer.from([((packet[0] & 0b0000011) << 6) | (packet[1] & 0b00111111)])
    const x = xBuffer.readInt8(0)
    const yBuffer = Buffer.from([((packet[0] & 0b0001100) << 4) | (packet[2] & 0b00111111)])
    const y = yBuffer.readInt8(0)
    if (x !== 0 || y !== 0) {
      events.push({ type: 'move', x, y })
    }
    for (const event of events) {
      debug('mousePacketParser', 'yielding events', events)
      yield { ...event, state }
    }
  }
}

export const mouseParserAsyncIterator = (serialport: AsyncIterable<Buffer>) =>
  mousePacketParser(mousePacketizer(serialport))
