import '@testing-library/jest-dom';
import { afterEach, beforeEach, vi } from 'vitest';

type ExpectedConsoleError = string | RegExp;

let unexpectedConsoleErrors: unknown[][] = [];
let expectedConsoleErrors: ExpectedConsoleError[] = [];

export function allowConsoleErrorOnce(expected: ExpectedConsoleError): void {
  expectedConsoleErrors.push(expected);
}

beforeEach(() => {
  unexpectedConsoleErrors = [];
  expectedConsoleErrors = [];

  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const message = args.map(String).join(' ');
    const expectedIndex = expectedConsoleErrors.findIndex(expected =>
      typeof expected === 'string' ? message.includes(expected) : expected.test(message),
    );

    if (expectedIndex >= 0) {
      expectedConsoleErrors.splice(expectedIndex, 1);
      return;
    }

    unexpectedConsoleErrors.push(args);
  });
});

afterEach(() => {
  if (unexpectedConsoleErrors.length > 0) {
    throw new Error(`Unexpected console.error:\n${unexpectedConsoleErrors.map(args => args.map(String).join(' ')).join('\n')}`);
  }
  if (expectedConsoleErrors.length > 0) {
    throw new Error(`Expected console.error was not emitted: ${expectedConsoleErrors.map(String).join(', ')}`);
  }
});
