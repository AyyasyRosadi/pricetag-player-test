// Vite picks this file up automatically. Autoprefixer resolves the browser
// range from the `browserslist` field in package.json (currently Chrome 56+),
// so it re-adds prefixes such as `-webkit-user-select` / `-webkit-appearance`
// that are still required by 2017-era Chrome builds.
export default {
  plugins: {
    autoprefixer: {},
  },
}
