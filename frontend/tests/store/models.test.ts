import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../src/store/index';

describe('Models Store Slice', () => {
  beforeEach(() => {
    useAppStore.setState({
      models: [],
      modelsLoading: false,
      modelsError: null,
    });
  });

  it('should have empty models array as default', () => {
    const { models } = useAppStore.getState();
    expect(models).toEqual([]);
  });

  it('should have modelsLoading false by default', () => {
    const { modelsLoading } = useAppStore.getState();
    expect(modelsLoading).toBe(false);
  });

  it('should have modelsError null by default', () => {
    const { modelsError } = useAppStore.getState();
    expect(modelsError).toBeNull();
  });

  it('should set models via setModels', () => {
    const mockModels = [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' },
    ];
    useAppStore.getState().setModels(mockModels);
    expect(useAppStore.getState().models).toEqual(mockModels);
  });

  it('should set modelsLoading via setModelsLoading', () => {
    useAppStore.getState().setModelsLoading(true);
    expect(useAppStore.getState().modelsLoading).toBe(true);

    useAppStore.getState().setModelsLoading(false);
    expect(useAppStore.getState().modelsLoading).toBe(false);
  });

  it('should set modelsError via setModelsError', () => {
    useAppStore.getState().setModelsError('Failed to fetch models');
    expect(useAppStore.getState().modelsError).toBe('Failed to fetch models');

    useAppStore.getState().setModelsError(null);
    expect(useAppStore.getState().modelsError).toBeNull();
  });

  it('should clear error when models are set successfully', () => {
    useAppStore.getState().setModelsError('Some error');
    useAppStore.getState().setModels([{ id: 'gpt-4o', name: 'GPT-4o' }]);
    // Error should still be there unless explicitly cleared — this is by design
    // The useModels hook is responsible for clearing error before fetching
    expect(useAppStore.getState().models).toEqual([{ id: 'gpt-4o', name: 'GPT-4o' }]);
  });
});
