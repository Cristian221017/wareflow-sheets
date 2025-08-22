import { beforeAll, vi } from 'vitest';

// Mock do localStorage para testes
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

beforeAll(() => {
  // @ts-ignore
  global.localStorage = localStorageMock;
});

// Mock do console para reduzir ruído nos testes
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
};