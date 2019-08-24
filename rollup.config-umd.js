import resolve from 'rollup-plugin-node-resolve'

const deps = Object.keys(require('./package.json').dependencies)

export default {
  input: './dist-ts/index.js',
  plugins: [
    resolve({
      preferBuiltins: true,
    })
  ],
  output: {
    format: 'umd',
    name: 'streamingIterables',
    file: './dist/index.js'
  },
  external: deps
}
