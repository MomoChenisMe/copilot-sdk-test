import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Archive,
  Trash2,
  CheckSquare,
  FileText,
  PenTool,
  Layers,
  ChevronDown,
  ChevronRight,
  CheckCheck,
  ArrowDown,
  RotateCcw,
} from 'lucide-react';
import { Markdown } from '../shared/Markdown';
import type { ChangeDetail } from '../../lib/openspec-api';

interface OpenSpecChangeDetailProps {
  change: ChangeDetail | null;
  onBack: () => void;
  onTaskToggle: (taskLine: string, checked: boolean) => void;
  onBatchToggle: (tasks: { taskLine: string; checked: boolean }[]) => void;
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

// ── Section Grouping ────────────────────────────────────────────────────────

interface TaskSection {
  heading: ParsedTaskLine | null;
  headingIdx: number;
  tasks: ParsedTaskLine[];
  completedCount: number;
  totalCount: number;
}

function groupIntoSections(tasks: ParsedTaskLine[]): TaskSection[] {
  const sections: TaskSection[] = [];
  let current: TaskSection = {
    heading: null,
    headingIdx: -1,
    tasks: [],
    completedCount: 0,
    totalCount: 0,
  };

  tasks.forEach((line, idx) => {
    if (line.type === 'heading') {
      if (current.tasks.length > 0 || current.heading) {
        sections.push(current);
      }
      current = { heading: line, headingIdx: idx, tasks: [], completedCount: 0, totalCount: 0 };
    } else if (line.type === 'task') {
      current.tasks.push(line);
      current.totalCount++;
      if (line.checked) current.completedCount++;
    }
  });

  if (current.tasks.length > 0 || current.heading) {
    sections.push(current);
  }

  return sections;
}

// ── Sub-tab Config ──────────────────────────────────────────────────────────

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
  onBatchToggle,
  onArchive,
  onDelete,
}: OpenSpecChangeDetailProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<DetailTab>('tasks');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const parsedTasks = useMemo(
    () => (change?.tasks ? parseTasksMd(change.tasks) : []),
    [change?.tasks],
  );

  const tasksCompleted = parsedTasks.filter((t) => t.type === 'task' && t.checked).length;
  const tasksTotal = parsedTasks.filter((t) => t.type === 'task').length;

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

  const pct = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
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
              completed: tasksCompleted,
              total: tasksTotal,
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
      <div className="px-3 pt-2 shrink-0">
        <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-border shrink-0">
        {DETAIL_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg whitespace-nowrap transition-colors border ${
              activeTab === tab.id
                ? 'border-accent text-accent bg-accent/5'
                : 'border-transparent text-text-secondary hover:bg-bg-secondary'
            }`}
          >
            <tab.icon size={12} />
            {t(tab.labelKey, tab.id)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'tasks' && (
          <TasksView
            tasks={parsedTasks}
            onToggle={handleTaskToggle}
            onBatchToggle={onBatchToggle}
          />
        )}
        {activeTab === 'proposal' && (
          <MarkdownView content={change.proposal ?? ''} emptyKey="openspecPanel.detail.noProposal" />
        )}
        {activeTab === 'design' && (
          <MarkdownView content={change.design ?? ''} emptyKey="openspecPanel.detail.noDesign" />
        )}
        {activeTab === 'specs' && <DeltaSpecsView specs={change.specs} />}
      </div>
    </div>
  );
}

// ── Tasks View (redesigned) ─────────────────────────────────────────────────

function TasksView({
  tasks,
  onToggle,
  onBatchToggle,
}: {
  tasks: ParsedTaskLine[];
  onToggle: (line: ParsedTaskLine) => void;
  onBatchToggle: (tasks: { taskLine: string; checked: boolean }[]) => void;
}) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const sections = useMemo(() => groupIntoSections(tasks), [tasks]);
  const allTasks = useMemo(() => tasks.filter((t) => t.type === 'task'), [tasks]);
  const completedCount = allTasks.filter((t) => t.checked).length;
  const totalCount = allTasks.length;
  const allComplete = completedCount === totalCount && totalCount > 0;

  // Reset batch loading when tasks prop changes (data refreshed)
  useEffect(() => {
    setBatchLoading(false);
  }, [tasks]);

  const toggleSection = useCallback((idx: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const handleMarkAllComplete = useCallback(() => {
    const unchecked = allTasks.filter((t) => !t.checked);
    if (unchecked.length === 0) return;
    setBatchLoading(true);
    onBatchToggle(unchecked.map((t) => ({ taskLine: t.raw, checked: true })));
  }, [allTasks, onBatchToggle]);

  const handleResetTasks = useCallback(() => {
    const checked = allTasks.filter((t) => t.checked);
    if (checked.length === 0) return;
    setBatchLoading(true);
    onBatchToggle(checked.map((t) => ({ taskLine: t.raw, checked: false })));
  }, [allTasks, onBatchToggle]);

  const handleNextIncomplete = useCallback(() => {
    let globalIdx = 0;
    for (const section of sections) {
      for (let i = 0; i < section.tasks.length; i++) {
        if (!section.tasks[i].checked) {
          // Expand section if collapsed
          if (section.headingIdx >= 0 && collapsed.has(section.headingIdx)) {
            setCollapsed((prev) => {
              const next = new Set(prev);
              next.delete(section.headingIdx);
              return next;
            });
          }
          // Scroll to task after potential re-render
          const targetIdx = globalIdx;
          setTimeout(() => {
            const el = wrapperRef.current?.querySelector(`[data-task-idx="${targetIdx}"]`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('ring-2', 'ring-accent/50');
              setTimeout(() => el.classList.remove('ring-2', 'ring-accent/50'), 1500);
            }
          }, 60);
          return;
        }
        globalIdx++;
      }
    }
  }, [sections, collapsed]);

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-text-muted text-sm">
        {t('openspecPanel.detail.noTasks', 'No tasks defined')}
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-bg-primary/50 sticky top-0 z-10 backdrop-blur-sm">
        <button
          onClick={handleMarkAllComplete}
          disabled={allComplete || batchLoading}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md transition-colors bg-green-500/10 text-green-500 hover:bg-green-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          title={t('openspecPanel.detail.toolbar.markAllComplete', 'Mark all complete')}
        >
          <CheckCheck size={11} />
          {t('openspecPanel.detail.toolbar.markAllComplete', 'Mark all complete')}
        </button>
        <button
          onClick={handleNextIncomplete}
          disabled={allComplete || batchLoading}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md transition-colors bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed"
          title={t('openspecPanel.detail.toolbar.nextIncomplete', 'Next incomplete')}
        >
          <ArrowDown size={11} />
          {t('openspecPanel.detail.toolbar.nextIncomplete', 'Next incomplete')}
        </button>
        <button
          onClick={handleResetTasks}
          disabled={completedCount === 0 || batchLoading}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md transition-colors bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          title={t('openspecPanel.detail.toolbar.resetTasks', 'Reset tasks')}
        >
          <RotateCcw size={11} />
          {t('openspecPanel.detail.toolbar.resetTasks', 'Reset tasks')}
        </button>
        <span className="ml-auto text-[10px] text-text-muted font-medium tabular-nums">
          {completedCount}/{totalCount}
        </span>
      </div>

      {/* Sections */}
      <div className="p-2 space-y-1.5">
        {sections.map((section, sectionIdx) => {
          const isCollapsed = section.headingIdx >= 0 && collapsed.has(section.headingIdx);
          const sectionComplete =
            section.completedCount === section.totalCount && section.totalCount > 0;
          const sectionStartIdx = sections
            .slice(0, sectionIdx)
            .reduce((sum, s) => sum + s.tasks.length, 0);

          return (
            <div
              key={sectionIdx}
              className="rounded-lg border border-border overflow-hidden"
            >
              {/* Section header */}
              {section.heading && (
                <button
                  onClick={() => toggleSection(section.headingIdx)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                    sectionComplete
                      ? 'bg-green-500/5 hover:bg-green-500/10'
                      : 'bg-bg-secondary hover:bg-bg-tertiary'
                  }`}
                >
                  {isCollapsed ? (
                    <ChevronRight size={12} className="text-text-muted shrink-0" />
                  ) : (
                    <ChevronDown size={12} className="text-text-muted shrink-0" />
                  )}
                  <span
                    className={`text-xs font-semibold flex-1 truncate ${
                      sectionComplete ? 'text-green-500' : 'text-text-primary'
                    }`}
                  >
                    {section.heading.text}
                  </span>
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
                      sectionComplete
                        ? 'bg-green-500/20 text-green-500'
                        : 'bg-text-muted/10 text-text-muted'
                    }`}
                  >
                    {section.completedCount}/{section.totalCount}
                  </span>
                </button>
              )}

              {/* Tasks in section */}
              {!isCollapsed && (
                <div className={section.heading ? 'border-t border-border' : ''}>
                  {section.tasks.map((task, taskIdx) => {
                    const globalIdx = sectionStartIdx + taskIdx;
                    return (
                      <label
                        key={globalIdx}
                        data-task-idx={globalIdx}
                        className={`flex items-start gap-2.5 px-3 py-1.5 cursor-pointer transition-all rounded-sm ${
                          task.checked
                            ? 'bg-green-500/[0.02] hover:bg-green-500/[0.06]'
                            : 'hover:bg-bg-tertiary'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={task.checked ?? false}
                          onChange={() => onToggle(task)}
                          className="mt-0.5 accent-accent shrink-0 w-3.5 h-3.5"
                        />
                        <span
                          className={`text-xs leading-relaxed ${
                            task.checked
                              ? 'text-text-muted line-through decoration-text-muted/40'
                              : 'text-text-primary'
                          }`}
                        >
                          {task.text}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
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

function DeltaSpecsView({ specs }: { specs: string[] }) {
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
      {specs.map((name) => (
        <div
          key={name}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-bg-primary"
        >
          <Layers size={14} className="text-accent shrink-0" />
          <p className="text-xs font-medium text-text-primary truncate">{name}</p>
        </div>
      ))}
    </div>
  );
}
