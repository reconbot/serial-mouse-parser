#!/usr/bin/env node
// tslint:disable: no-console
import { SerialPort } from 'serialport'
import robot from 'robotjs'
import { mouseParserAsyncIterator } from '../lib/index'

async function findPort() {
  const ports = await SerialPort.list()
  for (const port of ports) {
    if (/Prolific/i.test(port.manufacturer || '')) {
      return port.path
    }
  }
  throw new Error('No Prolifics found')
}

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
  const path = await findPort()
  const port = new SerialPort({ path, baudRate: 1200, stopBits: 1, dataBits: 8 })
  port.on('open', () => console.log('opened', path))
  for await (const event of mouseParserAsyncIterator(port)) {
    switch (event.type) {
      case 'move':
        move(event as any)
        break
      case 'mouseDown':
        robot.mouseToggle('down', 'left')
        break
      case 'mouseUp':
        robot.mouseToggle('up', 'left')
        break
      case 'rightMouseDown':
        robot.mouseToggle('down', 'right')
        break
      case 'rightMouseUp':
        robot.mouseToggle('up', 'right')
        break
      default:
        console.log('unhandled', event)
    }
  }
})()

process.on('unhandledRejection', console.error)
