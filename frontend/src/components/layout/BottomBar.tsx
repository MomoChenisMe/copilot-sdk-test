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
      {/* Tab bar */}
      <div className="flex border-b border-border">
        <button
          onClick={() => onTabChange('copilot')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            activeTab === 'copilot'
              ? 'text-accent border-b-2 border-accent'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          Copilot
        </button>
        <button
          onClick={() => onTabChange('terminal')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            activeTab === 'terminal'
              ? 'text-accent border-b-2 border-accent'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          Terminal
        </button>
      </div>

      {/* Input area (only for copilot tab) */}
      {activeTab === 'copilot' && (
        <div>
          <div className="flex items-center px-3 pt-2">
            <ModelSelector currentModel={currentModel} onSelect={onModelChange} />
          </div>
          <Input
            onSend={onSend}
            onAbort={onAbort}
            isStreaming={isStreaming}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}
