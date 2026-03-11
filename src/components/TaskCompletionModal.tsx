import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, X, Clock, CheckCircle2, AlertCircle, Copy, Check, Smartphone } from 'lucide-react';

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

type Phase = 'instructions' | 'countdown' | 'submit' | 'confirmed';

const TIMER_DURATION: Record<string, number> = {
  comment: 30,
  subscribe: 28,
  like: 22,
};

export default function TaskCompletionModal({ task, onComplete, onClose }: TaskCompletionModalProps) {
  const timerSeconds = TIMER_DURATION[task.task_type] ?? 25;
  const [phase, setPhase] = useState<Phase>('instructions');
  const [secondsLeft, setSecondsLeft] = useState(timerSeconds);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const handleOpenPost = () => {
    window.open(task.post_url, '_blank', 'noopener,noreferrer');
    setPhase('countdown');

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
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(task.post_url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement('textarea');
      el.value = task.post_url;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    }
  };

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

  const platformLabel = task.platform.charAt(0).toUpperCase() + task.platform.slice(1);
  const taskTypeLabel = task.task_type.charAt(0).toUpperCase() + task.task_type.slice(1);
  const taskLabel = `${platformLabel} ${taskTypeLabel}`;
  const wordCount = commentText.trim().split(/\s+/).filter(Boolean).length;

  const platformAccent: Record<string, string> = {
    instagram: 'text-pink-400',
    facebook: 'text-blue-400',
    youtube: 'text-red-400',
  };
  const accentClass = platformAccent[task.platform] ?? 'text-primary';

  const progressPct = phase === 'countdown'
    ? Math.round(((timerSeconds - secondsLeft) / timerSeconds) * 100)
    : phase === 'submit' || phase === 'confirmed' ? 100 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-border rounded shadow-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className={`label-caps ${accentClass}`}>{taskLabel}</p>
            <p className="text-xs text-foreground-muted mt-0.5 truncate max-w-xs">
              {task.title || task.post_url}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm value-earn font-bold">+{task.reward_points} pts</span>
            <button onClick={onClose} className="text-foreground-dim hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-surface-elevated">
          <div
            className="h-full bg-primary transition-all duration-1000"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* ── PHASE: Instructions ── */}
        {phase === 'instructions' && (
          <div className="p-6">
            {/* Steps */}
            <div className="space-y-3 mb-6">
              {[
                { n: 1, text: 'Click "Open Post" to visit the social media post' },
                { n: 2, text: `Perform the required action: ${task.task_type} the post` },
                { n: 3, text: 'Return here and click "Task Completed"' },
              ].map(step => (
                <div key={step.n} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="font-mono text-[10px] text-primary font-bold">{step.n}</span>
                  </div>
                  <p className="text-sm text-foreground-muted leading-relaxed">{step.text}</p>
                </div>
              ))}
            </div>

            {/* Open Post button */}
            <button
              onClick={handleOpenPost}
              className="w-full py-3 bg-primary text-primary-foreground rounded text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-cta"
            >
              <ExternalLink className="w-4 h-4" />
              Open Post
            </button>

            {/* Mobile notice */}
            <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded bg-surface-elevated border border-border-subtle">
              <Smartphone className="w-3.5 h-3.5 text-foreground-dim flex-shrink-0 mt-0.5" />
              <p className="text-xs text-foreground-dim leading-relaxed">
                If {platformLabel} opens in the app, return here after completing the task.
              </p>
            </div>

            {/* Copy link fallback */}
            <div className="mt-4 text-center">
              <p className="text-xs text-foreground-dim mb-2">If the link does not open, click here to copy the link.</p>
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded text-xs text-foreground-muted hover:text-foreground hover:border-foreground-dim transition-colors"
              >
                {linkCopied
                  ? <><Check className="w-3.5 h-3.5 text-earn" /> Link copied to clipboard</>
                  : <><Copy className="w-3.5 h-3.5" /> Copy Link</>
                }
              </button>
            </div>
          </div>
        )}

        {/* ── PHASE: Countdown ── */}
        {phase === 'countdown' && (
          <div className="p-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-5">
              <Clock className="w-4 h-4 text-foreground-muted" />
              <p className="label-caps">MINIMUM COMPLETION TIME</p>
            </div>
            <div className={`font-mono text-7xl font-bold mb-3 tabular-nums transition-colors ${secondsLeft <= 5 ? 'text-spend animate-timer' : 'text-foreground'}`}>
              {String(secondsLeft).padStart(2, '0')}
            </div>
            <p className="text-sm text-foreground-muted mb-6">
              Complete the task in the new tab, then return here.
            </p>

            {/* Open again + copy fallback */}
            <div className="flex items-center justify-center gap-4">
              <a
                href={task.post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open post again
              </a>
              <span className="text-foreground-dim text-xs">·</span>
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground transition-colors"
              >
                {linkCopied
                  ? <><Check className="w-3.5 h-3.5 text-earn" /> Copied!</>
                  : <><Copy className="w-3.5 h-3.5" /> Copy link</>
                }
              </button>
            </div>
          </div>
        )}

        {/* ── PHASE: Submit ── */}
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
                  onChange={e => { setCommentText(e.target.value); setError(''); }}
                  placeholder="Paste the exact comment you posted..."
                  rows={3}
                  className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-primary/60 resize-none font-sans"
                />
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-xs text-foreground-dim">Min. 5 words required</p>
                  <p className={`text-xs font-mono ${wordCount >= 5 ? 'text-earn' : 'text-foreground-dim'}`}>
                    {wordCount} words
                  </p>
                </div>
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
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-cta"
              >
                {submitting ? 'Submitting…' : 'Task Completed'}
              </button>
            </div>
          </div>
        )}

        {/* ── PHASE: Confirmed ── */}
        {phase === 'confirmed' && (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-earn/10 border border-earn/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6 text-earn" />
            </div>
            <div className="font-mono text-4xl font-bold value-earn mb-1">
              +{task.reward_points}
            </div>
            <div className="font-mono text-sm text-earn mb-4">POINTS PENDING APPROVAL</div>
            <p className="text-sm text-foreground-muted mb-6">
              Completion submitted. Points will be credited after the task owner reviews your submission.
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
