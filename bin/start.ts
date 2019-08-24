#!/usr/bin/env node
// tslint:disable: no-console
import SerialPort from 'serialport'
import robot from 'robotjs'
import { MouseParserStream } from '../lib/index'

async function findPort() {
  const ports = await SerialPort.list()
  for (const port of ports) {
    if (/Prolific/i.test(port.manufacturer)) {
      return port.comName as string
    }
  }
  throw new Error('No Prolifics found')
}

const binaryString = (buff: Buffer) =>
  Array.from(buff)
    .map(byte => byte.toString(2).padStart(8, '0'))
    .join(' ')

const window = robot.getScreenSize()
const location = robot.getMousePos()

const move = ({ x, y }) => {
  location.x += x
  location.y += y
  if (location.x > window.width) {
    location.x = window.width
  }
  if (location.x < 0) {
    location.x = 0
  }
  if (location.y > window.height) {
    location.y = window.height
  }
  if (location.y < 0) {
    location.y = 0
  }
  robot.moveMouse(location.x, location.y)
}
;(async () => {
  const portName = await findPort()
  const port = new SerialPort(portName, { baudRate: 1200, stopBits: 1, dataBits: 8 })
  const parser = port.pipe(new MouseParserStream())
  port.on('open', () => console.log('opened', portName))
  parser.on('data', data => {
    switch (data.type) {
      case 'move':
        return move(data)
      case 'mouseDown':
        return robot.mouseToggle('down', 'left')
      case 'mouseUp':
        return robot.mouseToggle('up', 'left')
      case 'rightMouseDown':
        return robot.mouseToggle('down', 'right')
      case 'rightMouseUp':
        return robot.mouseToggle('up', 'right')
      default:
        console.log('unhandled', data)
    }
  })
})()

process.on('unhandledRejection', console.error)
