import { useEffect, useState } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface HomePageProps {
  user: User;
  workspaceId: string;
  userRole?: string;
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

interface PerformanceStats {
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  } | null;
  total: number;
  completed: number;
  overdue: number;
  completionRate: number;
  byPriority: { name: string; count: number }[];
  byStatus: { name: string; color: string; count: number }[];
}

interface WorkspaceMember {
  userId: string;
  user?: User;
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
  userRole = "member",
  onCreateBoard,
}: HomePageProps) {
  const [chartView, setChartView] = useState<
    "pie-chart" | "bar-chart" | "task-by-assignee"
  >("pie-chart");
  const [selectedPerformanceUserId, setSelectedPerformanceUserId] =
    useState(user.id);
  const isAdmin = ["owner", "admin"].includes(userRole);

  const { data: boards = [], isLoading: boardsLoading } = useQuery<Board[]>({
    queryKey: ["/api/workspaces", workspaceId, "boards"],
  });

  const { data: stats } = useQuery<DetailedStats>({
    queryKey: [`/api/workspaces/${workspaceId}/detailed-stats`],
  });

  const { data: members = [] } = useQuery<WorkspaceMember[]>({
    queryKey: [`/api/workspaces/${workspaceId}/members`],
    enabled: isAdmin,
  });

  const uniqueMembers = members.filter(
    (member, index, list) =>
      list.findIndex((candidate) => candidate.userId === member.userId) === index,
  );

  useEffect(() => {
    if (!isAdmin || uniqueMembers.length === 0) return;
    const selectedExists = uniqueMembers.some(
      (member) => member.userId === selectedPerformanceUserId,
    );
    if (!selectedExists) {
      setSelectedPerformanceUserId(uniqueMembers[0].userId);
    }
  }, [isAdmin, uniqueMembers, selectedPerformanceUserId]);

  const { data: performanceStats } = useQuery<PerformanceStats>({
    queryKey: [
      `/api/workspaces/${workspaceId}/performance?userId=${
        isAdmin ? selectedPerformanceUserId : user.id
      }`,
    ],
  });

  const firstName = user.firstName || "there";
  const total = stats?.total ?? 0;
  const completed = stats?.completed ?? 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const statusData = stats?.byStatus ?? [];
  const assigneeData = stats?.byAssignee ?? [];
  const maxAssigneeCount =
    assigneeData.length > 0 ? Math.max(...assigneeData.map((a) => a.count)) : 0;
  const performancePriorityData = performanceStats?.byPriority ?? [];
  const performanceStatusData = performanceStats?.byStatus ?? [];

  const boardTasksQueries = useQueries({
    queries: boards.map((board) => ({
      queryKey: ["/api/boards", board.id, "tasks"],
      enabled: boards.length > 0,
    })),
  });

  const boardPriorityCharts = boards
    .map((board, idx) => {
      const tasks = (boardTasksQueries[idx]?.data as any[]) || [];
      const counts: Record<string, number> = {
        urgent: 0,
        high: 0,
        medium: 0,
        low: 0,
      };

      for (const task of tasks) {
        const priority = task.priority || "medium";
        counts[priority] = (counts[priority] || 0) + 1;
      }

      const data = Object.entries(counts)
        .filter(([, value]) => value > 0)
        .map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
          color: PRIORITY_COLORS[name] || "#6b7280",
        }));

      return {
        id: board.id,
        name: board.name,
        data,
      };
    })
    .filter((board) => board.data.length > 0);

  const boardsChartLoading =
    boards.length > 0 &&
    boardTasksQueries.some((query) => query.isLoading || query.isPending);

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

      <Card className="p-5">
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold">Workspace Charts</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Switch between the analytics views below.
            </p>
          </div>

          <ToggleGroup
            type="single"
            value={chartView}
            onValueChange={(value) => {
              if (value) setChartView(value as typeof chartView);
            }}
            variant="outline"
            size="sm"
            className="rounded-lg border bg-muted/40 p-1"
          >
            <ToggleGroupItem value="pie-chart" className="text-xs">
              Pie Chart
            </ToggleGroupItem>
            <ToggleGroupItem value="bar-chart" className="text-xs">
              Bar Chart
            </ToggleGroupItem>
            <ToggleGroupItem value="task-by-assignee" className="text-xs">
              Task by Assignee
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {chartView === "pie-chart" && (
          boardsChartLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: Math.max(boards.length, 1) }).map((_, idx) => (
                <Card key={idx} className="p-4 space-y-3">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-48 w-full rounded-xl" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                </Card>
              ))}
            </div>
          ) : boardPriorityCharts.length > 0 ? (
            <div
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
              data-testid="chart-by-priority"
            >
              {boardPriorityCharts.map((board) => (
                <Card key={board.id} className="p-4">
                  <h4 className="text-sm font-semibold mb-3 truncate">
                    {board.name}
                  </h4>

                  <div className="flex flex-col items-center">
                    <div className="w-full h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={board.data}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={board.data.length > 1 ? 2 : 0}
                            dataKey="value"
                            nameKey="name"
                            stroke="hsl(var(--background))"
                          >
                            {board.data.map((entry, idx) => (
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
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs w-full">
                      {board.data.map((entry) => (
                        <div
                          key={entry.name}
                          className="flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-muted-foreground">
                              {entry.name}
                            </span>
                          </div>
                          <span className="font-medium">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
              No board priority data available yet.
            </div>
          )
        )}

        {chartView === "bar-chart" && (
          statusData.length > 0 ? (
            <div className="h-64" data-testid="chart-by-status">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={statusData}
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
                    width={96}
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
                    {statusData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color || "#6b7280"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
              No status data available yet.
            </div>
          )
        )}

        {chartView === "task-by-assignee" && (
          assigneeData.length > 0 ? (
            <div className="space-y-3 pt-2">
              {assigneeData.map((entry, idx) => {
                const pct =
                  maxAssigneeCount > 0
                    ? (entry.count / maxAssigneeCount) * 100
                    : 0;

                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3"
                    data-testid={`assignee-stat-${idx}`}
                  >
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarImage
                        src={entry.user?.profileImageUrl || undefined}
                      />
                      <AvatarFallback className="text-[10px]">
                        {entry.user?.firstName?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm min-w-[100px] shrink-0 truncate">
                      {[entry.user?.firstName, entry.user?.lastName]
                        .filter(Boolean)
                        .join(" ") || "User"}
                    </span>
                    <div className="flex-1 h-3 rounded-full bg-muted">
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
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
              No assignee data available yet.
            </div>
          )
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold">Performance</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {isAdmin
                ? "Pilih anggota untuk melihat performa task per orang."
                : "Ringkasan performa task kamu di workspace ini."}
            </p>
          </div>

          {isAdmin && (
            <Select
              value={selectedPerformanceUserId}
              onValueChange={setSelectedPerformanceUserId}
            >
              <SelectTrigger className="w-56" data-testid="select-performance-user">
                <SelectValue placeholder="Pilih anggota" />
              </SelectTrigger>
              <SelectContent>
                {uniqueMembers.map((member) => (
                  <SelectItem key={member.userId} value={member.userId}>
                    {[member.user?.firstName, member.user?.lastName]
                      .filter(Boolean)
                      .join(" ") || member.user?.email || "User"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {!performanceStats ? (
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5">
              <Avatar className="w-10 h-10">
                <AvatarImage
                  src={performanceStats.user?.profileImageUrl || undefined}
                />
                <AvatarFallback>
                  {performanceStats.user?.firstName?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {[performanceStats.user?.firstName, performanceStats.user?.lastName]
                    .filter(Boolean)
                    .join(" ") || "User"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Progress dan distribusi task user terpilih
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4 mb-6">
              {[
                { label: "Total Task", value: performanceStats.total },
                { label: "Completed", value: performanceStats.completed },
                { label: "Overdue", value: performanceStats.overdue },
                { label: "Completion Rate", value: `${performanceStats.completionRate}%` },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-2xl font-bold mt-1">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h4 className="text-sm font-medium mb-3">Task by Priority</h4>
                {performancePriorityData.some((item) => item.count > 0) ? (
                  <div className="h-64" data-testid="chart-performance-priority">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={performancePriorityData}>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "6px",
                            fontSize: 12,
                          }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {performancePriorityData.map((entry, idx) => (
                            <Cell
                              key={idx}
                              fill={PRIORITY_COLORS[entry.name] || "#6b7280"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                    Belum ada data priority untuk user ini.
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium mb-3">Task by Status</h4>
                {performanceStatusData.length > 0 ? (
                  <div className="h-64" data-testid="chart-performance-status">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={performanceStatusData} layout="vertical">
                        <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 11 }}
                          width={96}
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
                          {performanceStatusData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color || "#6b7280"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                    Belum ada data status untuk user ini.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </Card>

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
