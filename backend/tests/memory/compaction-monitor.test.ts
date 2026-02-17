import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompactionMonitor } from '../../src/memory/compaction-monitor.js';

describe('CompactionMonitor', () => {
  let monitor: CompactionMonitor;
  let flushCb: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    flushCb = vi.fn();
    monitor = new CompactionMonitor({ flushThreshold: 0.75, onFlush: flushCb });
  });

  it('does not trigger flush below threshold', () => {
    monitor.onUsageInfo('conv-1', 0.5, 1.0);
    expect(flushCb).not.toHaveBeenCalled();
  });

  it('triggers flush at threshold', () => {
    monitor.onUsageInfo('conv-1', 0.75, 1.0);
    expect(flushCb).toHaveBeenCalledWith('conv-1');
  });

  it('triggers flush above threshold', () => {
    monitor.onUsageInfo('conv-1', 0.9, 1.0);
    expect(flushCb).toHaveBeenCalledWith('conv-1');
  });

  it('only triggers once per cycle', () => {
    monitor.onUsageInfo('conv-1', 0.8, 1.0);
    expect(flushCb).toHaveBeenCalledTimes(1);
    monitor.onUsageInfo('conv-1', 0.85, 1.0);
    expect(flushCb).toHaveBeenCalledTimes(1);
  });

  it('resets after compaction complete', () => {
    monitor.onUsageInfo('conv-1', 0.8, 1.0);
    expect(flushCb).toHaveBeenCalledTimes(1);
    monitor.onCompactionComplete('conv-1');
    monitor.onUsageInfo('conv-1', 0.8, 1.0);
    expect(flushCb).toHaveBeenCalledTimes(2);
  });

  it('tracks multiple conversations independently', () => {
    monitor.onUsageInfo('conv-1', 0.8, 1.0);
    monitor.onUsageInfo('conv-2', 0.8, 1.0);
    expect(flushCb).toHaveBeenCalledTimes(2);
    expect(flushCb).toHaveBeenCalledWith('conv-1');
    expect(flushCb).toHaveBeenCalledWith('conv-2');
  });

  it('does not trigger when contextWindowMax is 0', () => {
    monitor.onUsageInfo('conv-1', 0.8, 0);
    expect(flushCb).not.toHaveBeenCalled();
  });
});
