// types/jest-dom.d.ts
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'

declare module 'bun:test' {
  interface Matchers<T = unknown> extends TestingLibraryMatchers<T, void> {
    // This interface extends TestingLibraryMatchers to provide jest-dom matchers in bun:test
    // The extension is intentional and provides type augmentation
    // Adding a dummy property to satisfy the no-empty-interface rule
    readonly __extendedForJestDom: true
  }
}
