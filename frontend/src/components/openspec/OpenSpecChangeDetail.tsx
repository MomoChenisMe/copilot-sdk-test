import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Archive, Trash2, CheckSquare, FileText, PenTool, Layers } from 'lucide-react';
import { Markdown } from '../shared/Markdown';
import type { ChangeDetail, DeltaSpecFile } from '../../lib/openspec-api';

interface OpenSpecChangeDetailProps {
  change: ChangeDetail | null;
  onBack: () => void;
  onTaskToggle: (taskLine: string, checked: boolean) => void;
  onArchive: () => void;
  onDelete: () => void;
}

type DetailTab = 'tasks' | 'proposal' | 'design' | 'specs';

// ── Task Parsing ────────────────────────────────────────────────────────────

interface ParsedTaskLine {
  type: 'heading' | 'task';
  text: string;
  checked?: boolean;
  raw: string;
}

function parseTasksMd(md: string): ParsedTaskLine[] {
  const lines = md.split('\n');
  const result: ParsedTaskLine[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)/);
    if (headingMatch) {
      result.push({ type: 'heading', text: headingMatch[1], raw: line });
      continue;
    }

    const taskMatch = line.match(/^- \[([ xX])\]\s+(.+)/);
    if (taskMatch) {
      result.push({
        type: 'task',
        checked: taskMatch[1] !== ' ',
        text: taskMatch[2],
        raw: line,
      });
    }
  }

  return result;
}

// ── Sub-tab Button ──────────────────────────────────────────────────────────

const DETAIL_TABS: { id: DetailTab; labelKey: string; icon: typeof CheckSquare }[] = [
  { id: 'tasks', labelKey: 'openspecPanel.detail.tabs.tasks', icon: CheckSquare },
  { id: 'proposal', labelKey: 'openspecPanel.detail.tabs.proposal', icon: FileText },
  { id: 'design', labelKey: 'openspecPanel.detail.tabs.design', icon: PenTool },
  { id: 'specs', labelKey: 'openspecPanel.detail.tabs.specs', icon: Layers },
];

// ── Component ───────────────────────────────────────────────────────────────

export function OpenSpecChangeDetail({
  change,
  onBack,
  onTaskToggle,
  onArchive,
  onDelete,
}: OpenSpecChangeDetailProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<DetailTab>('tasks');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const parsedTasks = useMemo(
    () => (change?.tasksMd ? parseTasksMd(change.tasksMd) : []),
    [change?.tasksMd],
  );

  const handleTaskToggle = useCallback(
    (line: ParsedTaskLine) => {
      if (line.type !== 'task') return;
      onTaskToggle(line.raw, !line.checked);
    },
    [onTaskToggle],
  );

  const handleDelete = useCallback(() => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete();
    setConfirmDelete(false);
  }, [confirmDelete, onDelete]);

  if (!change) {
    return (
      <div className="flex items-center justify-center py-12 text-text-muted text-sm">
        {t('openspecPanel.loading', 'Loading...')}
      </div>
    );
  }

  const pct =
    change.tasksTotal > 0
      ? Math.round((change.tasksCompleted / change.tasksTotal) * 100)
      : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-secondary"
          aria-label={t('openspecPanel.back', 'Back')}
        >
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{change.name}</p>
          <p className="text-[11px] text-text-muted">
            {t('openspecPanel.changes.progress', '{{completed}}/{{total}} tasks', {
              completed: change.tasksCompleted,
              total: change.tasksTotal,
            })}
            {' — '}
            {pct}%
          </p>
        </div>
        <button
          onClick={onArchive}
          className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-secondary"
          aria-label={t('openspecPanel.detail.archive', 'Archive')}
          title={t('openspecPanel.detail.archive', 'Archive')}
        >
          <Archive size={14} />
        </button>
        <button
          onClick={handleDelete}
          className={`p-1.5 rounded-lg transition-colors ${
            confirmDelete
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'hover:bg-bg-tertiary text-text-secondary'
          }`}
          aria-label={t('openspecPanel.detail.delete', 'Delete')}
          title={
            confirmDelete
              ? t('openspecPanel.detail.confirmDelete', 'Click again to confirm')
              : t('openspecPanel.detail.delete', 'Delete')
          }
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-3 pt-2">
        <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 px-3 py-2 border-b border-border-subtle">
        {DETAIL_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            <tab.icon size={12} />
            {t(tab.labelKey, tab.id)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'tasks' && (
          <TasksView tasks={parsedTasks} onToggle={handleTaskToggle} />
        )}
        {activeTab === 'proposal' && (
          <MarkdownView content={change.proposalMd} emptyKey="openspecPanel.detail.noProposal" />
        )}
        {activeTab === 'design' && (
          <MarkdownView content={change.designMd} emptyKey="openspecPanel.detail.noDesign" />
        )}
        {activeTab === 'specs' && <DeltaSpecsView specs={change.deltaSpecs} />}
      </div>
    </div>
  );
}

// ── Tasks View ──────────────────────────────────────────────────────────────

function TasksView({
  tasks,
  onToggle,
}: {
  tasks: ParsedTaskLine[];
  onToggle: (line: ParsedTaskLine) => void;
}) {
  const { t } = useTranslation();

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-text-muted text-sm">
        {t('openspecPanel.detail.noTasks', 'No tasks defined')}
      </div>
    );
  }

  return (
    <div className="p-3 space-y-1">
      {tasks.map((line, idx) => {
        if (line.type === 'heading') {
          return (
            <h4
              key={idx}
              className="text-xs font-semibold text-text-primary pt-3 pb-1 first:pt-0"
            >
              {line.text}
            </h4>
          );
        }

        return (
          <label
            key={idx}
            className="flex items-start gap-2 py-1 px-1 rounded hover:bg-bg-tertiary cursor-pointer group"
          >
            <input
              type="checkbox"
              checked={line.checked ?? false}
              onChange={() => onToggle(line)}
              className="mt-0.5 accent-accent shrink-0"
            />
            <span
              className={`text-xs leading-relaxed ${
                line.checked
                  ? 'text-text-muted line-through'
                  : 'text-text-primary'
              }`}
            >
              {line.text}
            </span>
          </label>
        );
      })}
    </div>
  );
}

// ── Markdown View ───────────────────────────────────────────────────────────

function MarkdownView({ content, emptyKey }: { content: string; emptyKey: string }) {
  const { t } = useTranslation();

  if (!content || content.trim().length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-text-muted text-sm">
        {t(emptyKey, 'No content')}
      </div>
    );
  }

  return (
    <div className="p-4 prose-sm">
      <Markdown content={content} />
    </div>
  );
}

// ── Delta Specs View ────────────────────────────────────────────────────────

function DeltaSpecsView({ specs }: { specs: DeltaSpecFile[] }) {
  const { t } = useTranslation();

  if (specs.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-text-muted text-sm">
        {t('openspecPanel.detail.noSpecs', 'No delta specs')}
      </div>
    );
  }

  return (
    <div className="p-3 space-y-1.5">
      {specs.map((spec) => (
        <div
          key={spec.path}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border-subtle bg-bg-primary"
        >
          <Layers size={14} className="text-accent shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-text-primary truncate">{spec.name}</p>
            <p className="text-[10px] text-text-muted truncate">{spec.path}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
