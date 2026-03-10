import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, X, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface TaskCompletionModalProps {
  task: {
    id: string;
    platform: string;
    task_type: string;
    post_url: string;
    reward_points: number;
    title?: string | null;
  };
  onComplete: (commentText?: string) => Promise<void>;
  onClose: () => void;
}

type Phase = 'countdown' | 'submit' | 'confirmed';

export default function TaskCompletionModal({ task, onComplete, onClose }: TaskCompletionModalProps) {
  const TIMER_SECONDS = task.task_type === 'comment' ? 45 : task.task_type === 'subscribe' ? 30 : 20;
  const [phase, setPhase] = useState<Phase>('countdown');
  const [secondsLeft, setSecondsLeft] = useState(TIMER_SECONDS);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const linkOpenedRef = useRef(false);

  useEffect(() => {
    // Open the link when modal mounts
    if (!linkOpenedRef.current) {
      linkOpenedRef.current = true;
      window.open(task.post_url, '_blank', 'noopener,noreferrer');
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setPhase('submit');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleSubmit = async () => {
    if (task.task_type === 'comment') {
      const wordCount = commentText.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount < 5) {
        setError('Comment must be at least 5 words');
        return;
      }
    }
    setError('');
    setSubmitting(true);
    try {
      await onComplete(task.task_type === 'comment' ? commentText : undefined);
      setPhase('confirmed');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const platformColor: Record<string, string> = {
    instagram: 'text-pink-400',
    facebook: 'text-blue-400',
    youtube: 'text-red-400',
  };

  const taskLabel = `${task.platform.charAt(0).toUpperCase() + task.platform.slice(1)} ${task.task_type.charAt(0).toUpperCase() + task.task_type.slice(1)}`;

  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-border rounded shadow-lg animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="label-caps">{taskLabel}</p>
            <p className="text-xs text-foreground-muted mt-0.5 truncate max-w-xs">{task.title || task.post_url}</p>
          </div>
          <button onClick={onClose} className="text-foreground-dim hover:text-foreground ml-4">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Countdown phase */}
        {phase === 'countdown' && (
          <div className="p-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-foreground-muted" />
              <p className="label-caps">MINIMUM COMPLETION TIME</p>
            </div>
            <div className={`font-mono text-6xl font-bold mb-2 tabular-nums ${secondsLeft <= 5 ? 'text-spend animate-timer' : 'text-foreground'}`}>
              {String(secondsLeft).padStart(2, '0')}
            </div>
            <p className="text-sm text-foreground-muted mb-6">
              The link has been opened. Complete the task in the new tab.
            </p>
            <a
              href={task.post_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-primary hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open link again
            </a>
          </div>
        )}

        {/* Submit phase */}
        {phase === 'submit' && (
          <div className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <CheckCircle2 className="w-4 h-4 text-earn" />
              <p className="text-sm font-medium text-foreground">Timer complete. Submit your action.</p>
            </div>

            {task.task_type === 'comment' && (
              <div className="mb-4">
                <label className="label-caps block mb-2">PASTE YOUR COMMENT</label>
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Paste the exact comment you posted..."
                  rows={3}
                  className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-primary/60 resize-none font-sans"
                />
                <p className="text-xs text-foreground-dim mt-1.5">
                  Min. 5 words · {commentText.trim().split(/\s+/).filter(Boolean).length} words entered
                </p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-2.5 mb-4 bg-spend-dim border border-spend/20 rounded text-sm text-spend">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-border rounded text-sm text-foreground-muted hover:text-foreground hover:border-foreground-dim transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Task Completed'}
              </button>
            </div>
          </div>
        )}

        {/* Confirmed phase */}
        {phase === 'confirmed' && (
          <div className="p-8 text-center">
            <div className="font-mono text-4xl font-bold value-earn mb-1 animate-value-flash">
              +{task.reward_points}
            </div>
            <div className="font-mono text-sm text-earn mb-4">POINTS</div>
            <p className="text-sm text-foreground-muted mb-6">
              Completion submitted. Points awarded after task owner approval.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-surface-elevated border border-border rounded text-sm text-foreground hover:border-primary/50 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
