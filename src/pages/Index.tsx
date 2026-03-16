import { Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, ArrowRight, Zap, Shield, Users, BarChart2, Target, Heart, Star } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded-sm flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-mono text-xs font-bold tracking-wider">EngagefeX</span>
        </div>
        <div className="flex items-center gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/25 cursor-default select-none">
                  Beta
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-center">
                This platform is currently in beta testing. Features may change and occasional bugs may occur.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Link to="/auth" className="text-sm text-foreground-muted hover:text-foreground transition-colors">Sign In</Link>
          <Link to="/auth?mode=signup" className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-semibold hover:opacity-90 transition-opacity">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-earn/10 border border-earn/20 rounded-full mb-8">
          <span className="w-1.5 h-1.5 bg-earn rounded-full" />
          <span className="label-caps text-earn">Organic Growth Accelerator for Creators & Marketers</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-foreground leading-tight mb-6">
          Turn Organic Posts Into<br />
          <span className="font-mono text-earn">Lead Generation Machines</span>
        </h1>
        <p className="text-lg text-foreground-muted max-w-xl mx-auto mb-10">
          EngagefeX helps creators and marketers generate the early engagement their posts need so social media algorithms push their content to more people — resulting in more reach, followers, leads, and sales.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/auth?mode=signup" className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded text-sm font-semibold hover:opacity-90 transition-opacity shadow-cta">
            Start Growing Organically <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/auth?mode=signup" className="flex items-center justify-center gap-2 px-6 py-3 border border-border text-foreground rounded text-sm font-medium hover:border-primary/50 transition-colors">
            See How It Works <Zap className="w-4 h-4" />
          </Link>
        </div>
        <p className="text-xs text-foreground-dim mt-4 font-mono">+50 bonus points on signup · no credit card required</p>
      </section>

      {/* Benefits section */}
      <section className="px-6 py-12 max-w-4xl mx-auto">
        <p className="label-caps text-center mb-2">WHY ENGAGEFEX</p>
        <p className="text-sm text-foreground-muted text-center mb-8">Turn Engagement Into Real Growth</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: BarChart2, title: 'More Reach', desc: 'Early engagement signals encourage social media algorithms to push your content to a wider audience.' },
            { icon: Users, title: 'More Followers', desc: 'Increased visibility brings more profile visits and new followers discovering your content.' },
            { icon: Target, title: 'More Leads', desc: 'Turn organic posts into lead generation assets without spending money on ads.' },
            { icon: Star, title: 'More Social Proof', desc: 'Posts with engagement attract more interaction and build trust with new viewers.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-surface border border-border rounded p-5">
              <Icon className="w-5 h-5 text-earn mb-3" />
              <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-xs text-foreground-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-12 max-w-4xl mx-auto">
        <p className="label-caps text-center mb-8">HOW IT WORKS</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { step: '01', title: 'Create Your Free Account', desc: 'Sign up in seconds and receive bonus credits to start engaging immediately.' },
            { step: '02', title: 'Earn Engagement Credits', desc: 'Complete simple engagement tasks like likes, comments, and subscriptions across supported platforms.' },
            { step: '03', title: 'Promote Your Own Posts', desc: 'Spend credits to launch campaigns that boost engagement on your own content.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="bg-surface border border-border rounded p-5">
              <span className="font-mono text-3xl font-bold text-primary/30">{step}</span>
              <h3 className="text-sm font-semibold text-foreground mt-2 mb-2">{title}</h3>
              <p className="text-xs text-foreground-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-12 max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Zap, title: 'Algorithm Boost', desc: 'Generate early engagement signals that help social media algorithms push your content further.' },
          { icon: BarChart2, title: 'Multi-Platform Growth', desc: 'Boost engagement across Facebook, Instagram, YouTube, and LinkedIn.' },
          { icon: Heart, title: 'Real Human Engagement', desc: 'Every action comes from real users inside the platform ecosystem.' },
          { icon: Star, title: 'Earn While You Engage', desc: 'Earn credits by helping other creators and spend them to promote your own posts.' },
          { icon: Users, title: 'Affiliate Earnings', desc: 'Earn recurring commissions by referring creators and marketers to EngagefeX.' },
          { icon: Shield, title: 'Anti-Abuse Protection', desc: 'Built-in safeguards ensure engagement quality and prevent fake activity.' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-surface border border-border rounded p-5">
            <Icon className="w-5 h-5 text-primary mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
            <p className="text-xs text-foreground-muted leading-relaxed">{desc}</p>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="px-6 py-16 max-w-2xl mx-auto text-center">
        <div className="bg-surface border border-primary/20 rounded-2xl p-10 space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Ready to grow your social presence?</h2>
          <p className="text-sm text-foreground-muted">Join thousands of creators exchanging real engagement. Free to start — earn your first points in minutes.</p>
          <Link to="/auth?mode=signup" className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded text-sm font-semibold hover:opacity-90 transition-opacity shadow-cta mt-2">
            Create Free Account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6 text-center">
        <p className="label-caps text-foreground-dim">EngagefeX · HUMAN-POWERED ENGAGEMENT · 2026</p>
      </footer>
    </div>
  );
};

export default Index;

