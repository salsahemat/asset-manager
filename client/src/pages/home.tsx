import { useQuery, useQueries } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ListTodo,
} from "lucide-react";
import { Link } from "wouter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { User } from "@shared/models/auth";
import type { Board } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface HomePageProps {
  user: User;
  workspaceId: string;
  onCreateBoard: () => void;
}

interface DetailedStats {
  total: number;
  completed: number;
  overdue: number;
  byStatus: { name: string; color: string; count: number }[];
  byPriority: { name: string; count: number }[];
  byAssignee: { user: any; count: number }[];
  recentActivity: any[];
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
};

export default function HomePage({
  user,
  workspaceId,
  onCreateBoard,
}: HomePageProps) {
  const { data: boards = [], isLoading: boardsLoading } = useQuery<Board[]>({
    queryKey: ["/api/workspaces", workspaceId, "boards"],
  });

  const { data: stats } = useQuery<DetailedStats>({
    queryKey: [`/api/workspaces/${workspaceId}/detailed-stats`],
  });

  const firstName = user.firstName || "there";
  const total = stats?.total ?? 0;
  const completed = stats?.completed ?? 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const priorityData = stats?.byPriority
    ? stats.byPriority
        .filter((p) => p.count > 0)
        .map((p) => ({
          name: p.name.charAt(0).toUpperCase() + p.name.slice(1),
          value: p.count,
          color: PRIORITY_COLORS[p.name] || "#6b7280",
        }))
    : [];

  // If multiple boards, fetch per-board tasks to show per-board charts
  const boardTasksQueries = useQueries({
    queries: boards.map((b) => ({
      queryKey: ["/api/boards", b.id, "tasks"],
      enabled: boards.length > 1,
    })),
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 overflow-auto h-full">
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          data-testid="text-welcome"
        >
          Welcome back, {firstName}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening in your workspace.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Tasks",
            value: total,
            icon: ListTodo,
            color: "text-primary",
          },
          {
            label: "Completed",
            value: completed,
            icon: CheckCircle2,
            color: "text-green-500",
          },
          {
            label: "Overdue",
            value: stats?.overdue ?? 0,
            icon: AlertCircle,
            color: "text-destructive",
          },
          {
            label: "Completion Rate",
            value: `${completionRate}%`,
            icon: TrendingUp,
            color: "text-blue-500",
          },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm text-muted-foreground">
                {stat.label}
              </span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div
              className="text-2xl font-bold"
              data-testid={`text-stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}
            >
              {stat.value}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* If multiple boards, show per-board priority charts */}
        {boards.length > 1 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((b, idx) => {
              const tasks = (boardTasksQueries[idx]?.data as any[]) || [];
              const counts: Record<string, number> = {
                urgent: 0,
                high: 0,
                medium: 0,
                low: 0,
              };
              for (const t of tasks) {
                const p = t.priority || "medium";
                counts[p] = (counts[p] || 0) + 1;
              }
              const pdata = Object.entries(counts)
                .filter(([, v]) => v > 0)
                .map(([name, value]) => ({
                  name: name.charAt(0).toUpperCase() + name.slice(1),
                  value,
                  color: PRIORITY_COLORS[name] || "#6b7280",
                }));
              if (pdata.length === 0) return null;
              return (
                <Card key={b.id} className="p-4">
                  <h4 className="text-sm font-semibold mb-3">{b.name}</h4>

                  <div className="flex flex-col items-center">
                    <div className="w-full h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pdata}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={pdata.length > 1 ? 2 : 0}
                            dataKey="value"
                            nameKey="name"
                            stroke="hsl(var(--background))"
                          >
                            {pdata.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-3 space-y-1 text-xs w-full">
                      {pdata.map((d) => (
                        <div key={d.name} className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: d.color }}
                          />
                          <span className="text-muted-foreground">
                            {d.name}
                          </span>
                          <span className="font-medium">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          // single-board / workspace aggregated charts (existing)
          <div className="grid lg:grid-cols-2 gap-6">
            {stats?.byStatus && stats.byStatus.length > 0 && (
              <Card className="p-5">
                <h3 className="text-sm font-semibold mb-4">Tasks by Status</h3>
                <div className="h-48" data-testid="chart-by-status">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.byStatus}
                      layout="vertical"
                      margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
                    >
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        width={80}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {stats.byStatus.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color || "#6b7280"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {priorityData.length > 0 && (
              <Card className="p-5">
                <h3 className="text-sm font-semibold mb-4">
                  Tasks by Priority
                </h3>
                <div
                  className="h-48 flex items-center"
                  data-testid="chart-by-priority"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={priorityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        dataKey="value"
                        nameKey="name"
                        strokeWidth={2}
                        stroke="hsl(var(--background))"
                      >
                        {priorityData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 shrink-0 ml-2">
                    {priorityData.map((d) => (
                      <div
                        key={d.name}
                        className="flex items-center gap-2 text-xs"
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: d.color }}
                        />
                        <span className="text-muted-foreground">{d.name}</span>
                        <span className="font-medium">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      {stats?.byAssignee && stats.byAssignee.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Tasks by Assignee</h3>
          <div className="space-y-3">
            {stats.byAssignee.map((entry, idx) => {
              const maxCount = Math.max(
                ...stats.byAssignee.map((a) => a.count),
              );
              const pct = maxCount > 0 ? (entry.count / maxCount) * 100 : 0;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-3"
                  data-testid={`assignee-stat-${idx}`}
                >
                  <Avatar className="w-6 h-6 shrink-0">
                    <AvatarImage
                      src={entry.user?.profileImageUrl || undefined}
                    />
                    <AvatarFallback className="text-[8px]">
                      {entry.user?.firstName?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm min-w-[80px] shrink-0 truncate">
                    {[entry.user?.firstName, entry.user?.lastName]
                      .filter(Boolean)
                      .join(" ") || "User"}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium shrink-0">
                    {entry.count}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div>
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <h2 className="text-lg font-semibold">Your Boards</h2>
          <Button
            size="sm"
            onClick={onCreateBoard}
            data-testid="button-create-board-home"
          >
            <Plus className="w-4 h-4 mr-1" />
            New Board
          </Button>
        </div>

        {boardsLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </Card>
            ))}
          </div>
        ) : boards.length === 0 ? (
          <Card className="p-8 text-center">
            <LayoutDashboard className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">No boards yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first board to start managing tasks.
            </p>
            <Button
              onClick={onCreateBoard}
              data-testid="button-create-first-board-home"
            >
              <Plus className="w-4 h-4 mr-1" />
              Create Board
            </Button>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board) => (
              <Link key={board.id} href={`/board/${board.id}`}>
                <Card
                  className="p-4 hover-elevate cursor-pointer"
                  data-testid={`card-board-${board.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
                      style={{ backgroundColor: board.coverColor || "#3b82f6" }}
                    >
                      <LayoutDashboard className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium truncate">{board.name}</h3>
                      {board.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {board.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <Badge variant="secondary" className="text-[10px]">
                      {board.visibility}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {board.createdAt
                        ? new Date(board.createdAt).toLocaleDateString()
                        : ""}
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
