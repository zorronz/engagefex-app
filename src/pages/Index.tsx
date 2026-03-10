import { Link } from 'react-router-dom';
import { TrendingUp, ArrowRight, Zap, Shield, Users } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded-sm flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-mono text-xs font-bold tracking-wider uppercase">EngageExchange</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/auth" className="text-sm text-foreground-muted hover:text-foreground transition-colors">Sign In</Link>
          <Link to="/auth?mode=signup" className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-semibold hover:opacity-90 transition-opacity">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-earn/10 border border-earn/20 rounded-full mb-8">
          <span className="w-1.5 h-1.5 bg-earn rounded-full" />
          <span className="label-caps text-earn">HUMAN-POWERED ENGAGEMENT EXCHANGE</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-foreground leading-tight mb-6">
          The social capital<br />
          <span className="font-mono text-earn">marketplace</span>
        </h1>
        <p className="text-lg text-foreground-muted max-w-xl mx-auto mb-10">
          Complete engagement tasks. Earn points. Launch campaigns. Every action is a quantifiable trade in the fairest social exchange platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/auth?mode=signup" className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded text-sm font-semibold hover:opacity-90 transition-opacity shadow-cta">
            Start Trading <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/auth" className="flex items-center justify-center gap-2 px-6 py-3 border border-border text-foreground rounded text-sm font-medium hover:border-primary/50 transition-colors">
            Sign In
          </Link>
        </div>
        <p className="text-xs text-foreground-dim mt-4 font-mono">+50 bonus points on signup</p>
      </section>

      {/* Point economy table */}
      <section className="px-6 py-12 max-w-3xl mx-auto">
        <p className="label-caps text-center mb-6">POINT ECONOMY</p>
        <div className="bg-surface border border-border rounded overflow-hidden">
          <div className="grid grid-cols-4 px-5 py-2.5 bg-surface-elevated border-b border-border">
            {['TASK', 'PLATFORM', 'EARN', 'COST'].map(h => <span key={h} className="label-caps">{h}</span>)}
          </div>
          {[
            { t: 'Like', p: 'Instagram', earn: 2, cost: 4 },
            { t: 'Comment', p: 'Instagram', earn: 8, cost: 12 },
            { t: 'Like', p: 'Facebook', earn: 2, cost: 4 },
            { t: 'Comment', p: 'Facebook', earn: 8, cost: 12 },
            { t: 'Comment', p: 'YouTube', earn: 10, cost: 15 },
            { t: 'Subscribe', p: 'YouTube', earn: 12, cost: 18 },
          ].map((r, i) => (
            <div key={i} className="grid grid-cols-4 px-5 py-3 border-b border-border-subtle last:border-0 hover:bg-surface-elevated transition-colors">
              <span className="font-mono text-xs text-foreground">{r.t}</span>
              <span className="text-xs text-foreground-muted">{r.p}</span>
              <span className="font-mono text-xs value-earn font-semibold">+{r.earn} pts</span>
              <span className="font-mono text-xs value-spend font-semibold">{r.cost} pts</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-12 max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Zap, title: 'Task Marketplace', desc: 'Browse hundreds of tasks sorted by platform, reward, and type. Start a task, complete it, get paid.' },
          { icon: Shield, title: 'Anti-Cheat System', desc: 'Countdown timers, comment verification, trust scores, and IP monitoring ensure every engagement is real.' },
          { icon: Users, title: 'Referral Program', desc: 'Earn 100 pts per referral signup and 25% commission on all their future purchases.' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-surface border border-border rounded p-5">
            <Icon className="w-5 h-5 text-primary mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
            <p className="text-xs text-foreground-muted leading-relaxed">{desc}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6 text-center">
        <p className="label-caps text-foreground-dim">ENGAGEEXCHANGE · HUMAN-POWERED ENGAGEMENT · 2026</p>
      </footer>
    </div>
  );
};

export default Index;
