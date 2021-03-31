module.exports = {
  extends: ["airbnb-base", "prettier"],
  plugins: ["prettier"],
  env: {
    es6: true,
    commonjs: true,
    node: true,
    mocha: true,
  },
  globals: {
    artifacts: "readonly",
    contract: "readonly",
    assert: "readonly",
    web3: true,
  },
  parserOptions: {
    ecmaVersion: 2018,
    ecmaFeatures: {
      jsx: true,
    },
  },
  rules: {
    "prettier/prettier": "error",
    indent: [2, 2],
    semi: ["error", "always"],
    "comma-dangle": [
      "error",
      {
        functions: "ignore",
        arrays: "always-multiline",
        objects: "always-multiline",
        imports: "always-multiline",
        exports: "always-multiline",
      },
    ],
    "max-len": "off",
    "no-underscore-dangle": "off",
    "arrow-parens": ["error", "always"],
    "no-unused-vars": ["error", { args: "none" }],
    "no-plusplus": ["error", { allowForLoopAfterthoughts: true }],
    "prefer-destructuring": ["error", { array: false, object: true }],
    "no-trailing-spaces": "off",
    "no-console": "off",
    "import/no-extraneous-dependencies": ["error", { devDependencies: ["*.js", "**/*.js"] }],
  },
};
