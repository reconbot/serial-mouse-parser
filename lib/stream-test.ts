import { MouseParserStream } from './stream'
import assert from 'assert'

const leftMousePress = Buffer.from([0b11100011, 0b10111111, 0b10000000])
const rightMousePress = Buffer.from([0b11010000, 0b10000000, 0b10000000])
const mouseMove = Buffer.from([0b11000001, 0b10001111, 0b10010011])

describe.only('MouseParserStream', () => {
  it('constructs', () => {
    // tslint:disable-next-line: no-unused-expression
    new MouseParserStream()
  })
  it('sends left button events', done => {
    const parser = new MouseParserStream()
    parser.on('data', event => {
      assert.deepStrictEqual(event, { type: 'onClick', state: { leftMouseButton: true, rightMouseButton: false } })
      done()
    })
    parser.write(leftMousePress)
  })

  it('sends right button events', done => {
    const parser = new MouseParserStream()
    parser.on('data', event => {
      assert.deepStrictEqual(event, { type: 'onRightClick', state: { leftMouseButton: false, rightMouseButton: true } })
      done()
    })
    parser.write(rightMousePress)
  })

  it('sends xy changes', done => {
    const parser = new MouseParserStream()
    parser.on('data', event => {
      const x = 79
      const y = 19
      assert.deepStrictEqual(event, { type: 'move', x, y, state: { leftMouseButton: false, rightMouseButton: false } })
      done()
    })
    parser.write(mouseMove)
  })
})
