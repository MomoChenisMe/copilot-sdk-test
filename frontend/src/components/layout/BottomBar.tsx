import { Input } from '../shared/Input';
import { ModelSelector } from '../copilot/ModelSelector';

type ActiveTab = 'copilot' | 'terminal';

interface BottomBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onSend: (text: string) => void;
  onAbort: () => void;
  isStreaming: boolean;
  disabled: boolean;
  currentModel: string;
  onModelChange: (modelId: string) => void;
}

export function BottomBar({
  activeTab,
  onTabChange,
  onSend,
  onAbort,
  isStreaming,
  disabled,
  currentModel,
  onModelChange,
}: BottomBarProps) {
  return (
    <div className="shrink-0 bg-bg-secondary border-t border-border">
      {/* Tab row: pill tabs + model selector on same line */}
      <div className="flex items-center justify-between px-3 py-2" data-testid="tab-row">
        {/* Pill tabs */}
        <div className="flex items-center bg-bg-tertiary rounded-full p-0.5">
          <button
            onClick={() => onTabChange('copilot')}
            className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
              activeTab === 'copilot'
                ? 'bg-accent text-white'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Copilot
          </button>
          <button
            onClick={() => onTabChange('terminal')}
            className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
              activeTab === 'terminal'
                ? 'bg-accent text-white'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Terminal
          </button>
        </div>

        {/* Model selector (only in copilot tab) */}
        {activeTab === 'copilot' && (
          <ModelSelector currentModel={currentModel} onSelect={onModelChange} />
        )}
      </div>

      {/* Input area (only for copilot tab) */}
      {activeTab === 'copilot' && (
        <Input
          onSend={onSend}
          onAbort={onAbort}
          isStreaming={isStreaming}
          disabled={disabled}
        />
      )}
    </div>
  );
}
