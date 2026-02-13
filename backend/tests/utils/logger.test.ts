import { describe, it, expect } from 'vitest';
import { createLogger } from '../../src/utils/logger.js';

describe('logger', () => {
  it('should create a pino logger instance', () => {
    const logger = createLogger('test');

    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should include the module name in bindings', () => {
    const logger = createLogger('my-module');

    // pino logger has bindings method
    expect(logger.bindings()).toEqual(
      expect.objectContaining({ module: 'my-module' }),
    );
  });

  it('should create child loggers with additional context', () => {
    const logger = createLogger('parent');
    const child = logger.child({ requestId: '123' });

    expect(child).toBeDefined();
    expect(typeof child.info).toBe('function');
  });
});
