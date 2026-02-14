import { describe, it, expect } from 'vitest';
import type { ToolRecord, MessageMetadata } from '../../src/lib/api';

describe('API Type Definitions', () => {
  describe('ToolRecord', () => {
    it('should accept a valid running tool record', () => {
      const record: ToolRecord = {
        toolCallId: 'call-1',
        toolName: 'bash',
        arguments: { command: 'echo hello' },
        status: 'running',
      };
      expect(record.toolCallId).toBe('call-1');
      expect(record.toolName).toBe('bash');
      expect(record.status).toBe('running');
      expect(record.arguments).toEqual({ command: 'echo hello' });
      expect(record.result).toBeUndefined();
      expect(record.error).toBeUndefined();
    });

    it('should accept a successful tool record with result', () => {
      const record: ToolRecord = {
        toolCallId: 'call-2',
        toolName: 'create',
        status: 'success',
        result: { content: 'File created', detailedContent: '/tmp/test.py' },
      };
      expect(record.status).toBe('success');
      expect(record.result).toEqual({ content: 'File created', detailedContent: '/tmp/test.py' });
    });

    it('should accept an error tool record', () => {
      const record: ToolRecord = {
        toolCallId: 'call-3',
        toolName: 'bash',
        status: 'error',
        error: 'Command failed',
      };
      expect(record.status).toBe('error');
      expect(record.error).toBe('Command failed');
    });
  });

  describe('MessageMetadata', () => {
    it('should accept metadata with toolRecords and reasoning', () => {
      const metadata: MessageMetadata = {
        toolRecords: [
          { toolCallId: 'c1', toolName: 'bash', status: 'success', result: { content: 'ok' } },
        ],
        reasoning: 'Thinking about the problem...',
      };
      expect(metadata.toolRecords).toHaveLength(1);
      expect(metadata.reasoning).toBe('Thinking about the problem...');
    });

    it('should accept metadata with only toolRecords', () => {
      const metadata: MessageMetadata = {
        toolRecords: [
          { toolCallId: 'c1', toolName: 'create', status: 'success' },
        ],
      };
      expect(metadata.toolRecords).toHaveLength(1);
      expect(metadata.reasoning).toBeUndefined();
    });

    it('should accept metadata with only reasoning', () => {
      const metadata: MessageMetadata = {
        reasoning: 'Some reasoning text',
      };
      expect(metadata.toolRecords).toBeUndefined();
      expect(metadata.reasoning).toBe('Some reasoning text');
    });

    it('should accept empty metadata', () => {
      const metadata: MessageMetadata = {};
      expect(metadata.toolRecords).toBeUndefined();
      expect(metadata.reasoning).toBeUndefined();
    });
  });
});
