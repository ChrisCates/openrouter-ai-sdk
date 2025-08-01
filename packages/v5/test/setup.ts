/**
 * Test setup file that applies Bun compatibility workarounds
 */

import { installTextStreamPolyfills } from './utils/text-stream-polyfill'

// Install TextDecoderStream and TextEncoderStream polyfills for Bun
installTextStreamPolyfills()

// Set up global test environment
globalThis.fetch =
  globalThis.fetch ||
  (() => {
    throw new Error('fetch is not available in test environment')
  })
