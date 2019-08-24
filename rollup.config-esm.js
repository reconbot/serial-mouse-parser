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
    format: 'esm',
    file: './dist/index-esm.js'
  },
  external: deps
}
