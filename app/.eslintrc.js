// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: [
    "expo",
    "prettier",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
  ],
  plugins: ["prettier"],
  rules: {
    "prettier/prettier": "warn",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/strict-boolean-expressions": "error",
  },
  parserOptions: {
    projectService: true,
    tsconfigRootDir: __dirname,
  },
};
