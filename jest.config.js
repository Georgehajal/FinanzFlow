/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  // Wir testen nur reine Logik (calc.ts, model.ts, dateUtils.ts) — keine UI
  testPathIgnorePatterns: ['/node_modules/', '/.expo/', '/dist/'],
  moduleFileExtensions: ['ts', 'tsx', 'js'],
};
