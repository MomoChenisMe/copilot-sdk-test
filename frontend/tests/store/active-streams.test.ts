import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../src/store/index';

describe('Store: activeStreams', () => {
  beforeEach(() => {
    useAppStore.setState({ activeStreams: {} });
  });

  it('should have empty activeStreams initially', () => {
    const { activeStreams } = useAppStore.getState();
    expect(activeStreams).toEqual({});
  });

  it('should set active streams from stream IDs via setActiveStreams', () => {
    useAppStore.getState().setActiveStreams(['conv-1', 'conv-2']);
    const { activeStreams } = useAppStore.getState();
    expect(activeStreams).toEqual({
      'conv-1': 'running',
      'conv-2': 'running',
    });
  });

  it('should replace existing activeStreams when setActiveStreams is called', () => {
    useAppStore.getState().setActiveStreams(['conv-1', 'conv-2']);
    useAppStore.getState().setActiveStreams(['conv-3']);
    const { activeStreams } = useAppStore.getState();
    expect(activeStreams).toEqual({ 'conv-3': 'running' });
  });

  it('should set empty activeStreams when setActiveStreams receives empty array', () => {
    useAppStore.getState().setActiveStreams(['conv-1']);
    useAppStore.getState().setActiveStreams([]);
    expect(useAppStore.getState().activeStreams).toEqual({});
  });

  it('should update a single stream status via updateStreamStatus', () => {
    useAppStore.getState().setActiveStreams(['conv-1', 'conv-2']);
    useAppStore.getState().updateStreamStatus('conv-1', 'idle');
    const { activeStreams } = useAppStore.getState();
    expect(activeStreams['conv-1']).toBe('idle');
    expect(activeStreams['conv-2']).toBe('running');
  });

  it('should add a new stream entry via updateStreamStatus', () => {
    useAppStore.getState().updateStreamStatus('conv-new', 'running');
    expect(useAppStore.getState().activeStreams['conv-new']).toBe('running');
  });

  it('should set error status via updateStreamStatus', () => {
    useAppStore.getState().updateStreamStatus('conv-1', 'error');
    expect(useAppStore.getState().activeStreams['conv-1']).toBe('error');
  });

  it('should remove a stream via removeStream', () => {
    useAppStore.getState().setActiveStreams(['conv-1', 'conv-2']);
    useAppStore.getState().removeStream('conv-1');
    const { activeStreams } = useAppStore.getState();
    expect(activeStreams['conv-1']).toBeUndefined();
    expect(activeStreams['conv-2']).toBe('running');
  });

  it('should not throw when removing a non-existent stream', () => {
    expect(() => useAppStore.getState().removeStream('nonexistent')).not.toThrow();
  });

  it('should not reset activeStreams when setActiveConversationId is called', () => {
    useAppStore.getState().setActiveStreams(['conv-1']);
    useAppStore.getState().setActiveConversationId('conv-2');
    // activeStreams should persist across conversation switches
    expect(useAppStore.getState().activeStreams).toEqual({ 'conv-1': 'running' });
  });

  it('should not reset activeStreams when clearStreaming is called', () => {
    useAppStore.getState().setActiveStreams(['conv-1']);
    useAppStore.getState().clearStreaming();
    // activeStreams is global, not per-conversation streaming state
    expect(useAppStore.getState().activeStreams).toEqual({ 'conv-1': 'running' });
  });
});
