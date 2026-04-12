'use client';

import React from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, Loader2, Circle } from 'lucide-react';
import { useApp } from '@/lib/context';
import type { Task, TaskStatus } from '@/lib/types';

// ─── Inline Chat Task List (pinned card) ───────────────────────────
export default function TaskListCard() {
  const { state, dispatch } = useApp();
  const { taskList, taskListCollapsed } = state;

  if (!taskList || taskList.length === 0) return null;

  const done = taskList.filter((t) => t.status === 'done').length;
  const failed = taskList.filter((t) => t.status === 'failed').length;
  const running = taskList.find((t) => t.status === 'running');
  const total = taskList.length;
  const progress = ((done + failed) / total) * 100;
  const allDone = done + failed === total;

  return (
    <div className="mx-4 mb-3 rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden task-list-card">
      {/* Header */}
      <button
        onClick={() => dispatch({ type: 'TOGGLE_TASK_LIST' })}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--secondary)]/50 transition-colors"
      >
        {/* Progress fraction */}
        <span className="text-xs font-mono font-bold text-[var(--muted-foreground)] min-w-[36px]">
          {done}/{total}
        </span>

        {/* Progress bar */}
        <div className="flex-1 h-1.5 bg-[var(--secondary)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: failed > 0
                ? 'linear-gradient(90deg, var(--success), var(--destructive))'
                : allDone
                  ? 'var(--success)'
                  : 'var(--primary)',
            }}
          />
        </div>

        {/* Current task name */}
        <span className="text-xs text-[var(--muted-foreground)] truncate max-w-[140px]">
          {allDone
            ? '✨ All done!'
            : running
              ? running.title
              : 'Waiting...'}
        </span>

        {taskListCollapsed ? (
          <ChevronDown className="w-3.5 h-3.5 text-[var(--muted-foreground)] flex-shrink-0" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-[var(--muted-foreground)] flex-shrink-0" />
        )}
      </button>

      {/* Task items */}
      {!taskListCollapsed && (
        <div className="px-3 pb-3 space-y-0.5">
          {taskList.map((task, idx) => (
            <TaskItem key={task.id} task={task} index={idx + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskItem({ task, index }: { task: Task; index: number }) {
  const statusIcon: Record<TaskStatus, React.ReactNode> = {
    pending: <Circle className="w-4 h-4 text-[var(--muted-foreground)]/40" />,
    running: <Loader2 className="w-4 h-4 text-[var(--primary)] animate-spin" />,
    done: (
      <div className="task-check-animate">
        <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
      </div>
    ),
    failed: <XCircle className="w-4 h-4 text-[var(--destructive)]" />,
  };

  const isRunning = task.status === 'running';
  const isDone = task.status === 'done';
  const isFailed = task.status === 'failed';

  return (
    <div
      className={`
        flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-all duration-300
        ${isRunning ? 'bg-[var(--primary)]/5 border border-[var(--primary)]/20' : ''}
        ${isDone ? 'opacity-60' : ''}
        ${isFailed ? 'bg-[var(--destructive)]/5' : ''}
      `}
      title={isFailed ? `Failed: ${task.errorReason}` : undefined}
    >
      {/* Status icon */}
      <div className="flex-shrink-0">{statusIcon[task.status]}</div>

      {/* Number + Title */}
      <span
        className={`text-xs leading-tight ${
          isRunning
            ? 'font-semibold text-[var(--foreground)]'
            : isDone
              ? 'line-through text-[var(--muted-foreground)]'
              : isFailed
                ? 'text-[var(--destructive)]'
                : 'text-[var(--foreground)]/80'
        }`}
      >
        <span className="font-mono text-[var(--muted-foreground)]/60 mr-1.5">{index}.</span>
        {task.title}
      </span>

      {/* Failed reason tooltip indicator */}
      {isFailed && task.errorReason && (
        <span className="ml-auto text-[9px] text-[var(--destructive)] bg-[var(--destructive)]/10 px-1.5 py-0.5 rounded flex-shrink-0">
          failed
        </span>
      )}
    </div>
  );
}

// ─── Floating Canvas Widget ────────────────────────────────────────
export function FloatingTaskWidget() {
  const { state, dispatch } = useApp();
  const { taskList } = state;

  if (!taskList || taskList.length === 0) return null;

  const done = taskList.filter((t) => t.status === 'done').length;
  const failed = taskList.filter((t) => t.status === 'failed').length;
  const running = taskList.find((t) => t.status === 'running');
  const total = taskList.length;
  const progress = ((done + failed) / total) * 100;
  const allDone = done + failed === total;

  return (
    <div className="absolute bottom-4 left-4 z-20 bg-[var(--card)]/95 backdrop-blur-sm border border-[var(--border)] rounded-xl shadow-xl px-4 py-2.5 max-w-[280px] task-list-card">
      <div className="flex items-center gap-3">
        {/* Mini progress ring */}
        <div className="relative w-8 h-8 flex-shrink-0">
          <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="13" fill="none" stroke="var(--secondary)" strokeWidth="3" />
            <circle
              cx="16"
              cy="16"
              r="13"
              fill="none"
              stroke={allDone ? 'var(--success)' : 'var(--primary)'}
              strokeWidth="3"
              strokeDasharray={`${(progress / 100) * 81.68} 81.68`}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-[var(--foreground)]">
            {done}/{total}
          </span>
        </div>

        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-[var(--foreground)] truncate">
            {allDone ? '✨ All tasks complete!' : running ? running.title : 'Building workflow...'}
          </p>
          <p className="text-[9px] text-[var(--muted-foreground)]">
            {done} of {total} steps done
            {failed > 0 && ` • ${failed} failed`}
          </p>
        </div>
      </div>
    </div>
  );
}
