import { MouseParserStream } from './stream'
import assert from 'assert'
import { collect } from 'bluestream'

const leftMousePress = Buffer.from([0b11100000, 0b10000000, 0b10000000])
const rightMousePress = Buffer.from([0b11010000, 0b10000000, 0b10000000])
const mouseButtonsUp = Buffer.from([0b11000000, 0b10000000, 0b10000000])
const mouseMove = Buffer.from([0b11000001, 0b10001111, 0b10010011])

describe('MouseParserStream', () => {
  it('constructs', () => {
    // tslint:disable-next-line: no-unused-expression
    new MouseParserStream()
  })
  it('sends left button events', async () => {
    const parser = new MouseParserStream()
    parser.write(leftMousePress)
    parser.write(mouseButtonsUp)
    parser.end()
    const events = await collect(parser)
    assert.deepStrictEqual(events, [
      { type: 'mouseDown', state: { leftMouseButton: true, rightMouseButton: false } },
      { type: 'mouseUp', state: { leftMouseButton: false, rightMouseButton: false } },
    ])
  })

  it('sends right button events', (done) => {
    const parser = new MouseParserStream()
    parser.on('data', (event) => {
      assert.deepStrictEqual(event, {
        type: 'rightMouseDown',
        state: { leftMouseButton: false, rightMouseButton: true },
      })
      done()
    })
    parser.write(rightMousePress)
  })

  it('sends xy changes', (done) => {
    const parser = new MouseParserStream()
    parser.on('data', (event) => {
      const x = 79
      const y = 19
      assert.deepStrictEqual(event, { type: 'move', x, y, state: { leftMouseButton: false, rightMouseButton: false } })
      done()
    })
    parser.write(mouseMove)
  })
})
