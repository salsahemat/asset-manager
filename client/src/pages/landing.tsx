import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  LayoutDashboard,
  Users,
  Zap,
  CheckCircle2,
  ArrowRight,
  Orbit,
} from "lucide-react";
import { Link } from "wouter";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-6 h-14">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Orbit className="w-5 h-5 text-primary-foreground" />
            </div>
            <span
              className="font-semibold text-lg tracking-tight"
              data-testid="text-logo"
            >
              Mesa
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/login">
              <Button variant="ghost" data-testid="button-login">
                Log in
              </Button>
            </a>
            <a href="/register">
              <Button data-testid="button-get-started">Get Started</Button>
            </a>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm text-muted-foreground mb-6">
            <Zap className="w-3.5 h-3.5" />
            <span>Project management, reimagined</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
            Organize your work,
            <br />
            <span className="text-primary">ship faster together</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Mesa brings your team's boards, tasks, and docs into one beautiful
            workspace. Stay aligned, move fast, and build great things.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <a href="/api/login">
              <Button size="lg" className="gap-2" data-testid="button-hero-cta">
                Start for free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </a>
          </div>
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Free forever
              plan
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> No credit
              card required
            </span>
          </div>
        </div>
      </section>

      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <Card className="p-1 bg-card/50">
            <div className="rounded-md bg-gradient-to-br from-primary/10 via-accent/30 to-primary/5 p-8 sm:p-12 flex items-center justify-center min-h-[320px]">
              <div className="grid grid-cols-3 gap-4 w-full max-w-lg">
                {["To Do", "In Progress", "Done"].map((col, i) => (
                  <div key={col} className="space-y-3">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {col}
                    </div>
                    {Array.from({ length: 3 - i }, (_, j) => (
                      <div
                        key={j}
                        className="bg-background rounded-md p-3 border shadow-sm"
                      >
                        <div className="h-2 rounded-full bg-muted w-full mb-2" />
                        <div className="h-2 rounded-full bg-muted w-2/3" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              Everything your team needs
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Powerful features to keep projects on track, all in one place.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                icon: LayoutDashboard,
                title: "Kanban Boards",
                desc: "Visualize your workflow with drag-and-drop boards. Move tasks through stages effortlessly.",
              },
              {
                icon: Users,
                title: "Team Workspaces",
                desc: "Organize your team with shared workspaces. Assign roles, invite members, collaborate.",
              },
              {
                icon: Zap,
                title: "Fast & Intuitive",
                desc: "Built for speed. Create tasks, switch boards, and manage priorities without friction.",
              },
            ].map((feature) => (
              <Card key={feature.title} className="p-6">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t py-8 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Orbit className="w-4 h-4 text-primary" />
            <span>Mesa</span>
          </div>
          <span>Built with care for modern teams</span>
        </div>
      </footer>
    </div>
  );
}
