# Future Test Scope

This directory contains tests that are temporarily moved here due to environment compatibility issues.

## Files in this directory

- `edge-runtime.test.ts` - Edge Runtime compatibility tests
- `streaming.test.ts` - Performance streaming tests

## Why these tests are here

These tests fail due to **ReadableStream compatibility issues** between Bun's test environment and the AI SDK's `@ai-sdk/provider-utils` library. The errors are:

1. `TypeError: readable should be ReadableStream` - The AI SDK expects specific ReadableStream types that our test mocks don't provide correctly
2. `TypeError: undefined is not an object (evaluating 'response.headers')` - Response header extraction failures in the AI SDK

## Future work

These tests should be revisited when:

1. The AI SDK versions stabilize (currently using canary versions)
2. Bun's ReadableStream compatibility improves

## Alternative

The Node.js streaming test (`../streaming-node.test.js`) provides basic streaming verification that works across environments.
