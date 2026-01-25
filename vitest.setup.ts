import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock React import for tests
import React from 'react';
global.React = React;

// Setup DOM mocks
if (typeof window !== 'undefined') {
  // Mock window.electron
  Object.defineProperty(window, 'electron', {
    value: {
      send: vi.fn(),
      on: vi.fn(),
      checkApiConfig: vi.fn(() => Promise.resolve({ hasConfig: true })),
    },
    writable: true,
  });
}
