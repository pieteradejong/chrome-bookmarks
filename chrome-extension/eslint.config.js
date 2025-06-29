module.exports = [
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'background/**',
      'popup/**',
      'options/**',
      'utils/smart-scanner.js',
      'utils/smart-tagger.js'
    ]
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        chrome: 'readonly',
        global: 'writable',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        AbortController: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        Promise: 'readonly',
        Map: 'readonly',
        Date: 'readonly',
        Array: 'readonly',
        Math: 'readonly',
        Error: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
      'no-console': 'off',
      'semi': ['error', 'always'],
      'quotes': ['error', 'single'],
      'indent': ['error', 2],
      'no-trailing-spaces': 'error',
      'eol-last': 'error',
      'comma-dangle': ['error', 'never'],
      'no-multiple-empty-lines': ['error', { 'max': 1 }],
      'space-before-function-paren': ['error', 'never'],
      'keyword-spacing': 'error',
      'space-infix-ops': 'error',
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'no-var': 'error',
      'prefer-const': 'error',
      'arrow-spacing': 'error'
    }
  },
  {
    files: ['**/*.test.js', '**/e2e/**/*.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly'
      }
    },
    rules: {
      'no-unused-expressions': 'off',
      'space-before-function-paren': 'off',
      'no-trailing-spaces': 'off',
      'eol-last': 'off'
    }
  }
];
