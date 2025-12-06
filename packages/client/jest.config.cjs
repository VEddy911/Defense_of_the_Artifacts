module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',          

  roots: ['<rootDir>/src'],

  // TS as ESM
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
  },

  extensionsToTreatAsEsm: ['.ts'],
};

