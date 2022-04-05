import resolve from "@rollup/plugin-node-resolve";
import pkg from "../package.json";
import { camelCase } from "./camelCase.js";

export default [{
  input: "src/index.js",
  plugins: [
    resolve(),
  ],
  output: {
    file: pkg.module,
    format: "esm",
    name: pkg.name,
  }
}, {
  input: "src/index.js",
  plugins: [
    resolve(),
  ],
  output: {
    file: pkg.main,
    format: "umd",
    name: camelCase(pkg.name),
  }
}];
