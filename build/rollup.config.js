import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs'; // Needed for pbf
import pkg from "../package.json";

export default {
  input: 'src/index.js',
  plugins: [
    resolve(),
    commonjs(),
  ],
  external: ['pbf'],
  output: {
    file: pkg.main,
    format: 'esm',
    name: pkg.name
  }
};
