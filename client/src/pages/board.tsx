import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  GripVertical,
  Calendar as CalendarIcon,
  MoreHorizontal,
  Trash2,
  ArrowUp,
  ArrowDown,
  Minus,
  Flag,
  Kanban,
  Table,
  CalendarDays,
  Filter,
  X,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type {
  Column,
  Task,
  Board as BoardType,
  Label,
  ChecklistItem,
} from "@shared/schema";
import type { User } from "@shared/models/auth";
import { TaskDetailDialog } from "@/components/task-detail-dialog";

interface BoardPageProps {
  boardId: string;
  workspaceId: string;
  userRole?: string;
}

const PRIORITY_CONFIG: Record<
  string,
  { icon: typeof ArrowUp; color: string; label: string }
> = {
  urgent: { icon: Flag, color: "text-red-500", label: "Urgent" },
  high: { icon: ArrowUp, color: "text-orange-500", label: "High" },
  medium: { icon: Minus, color: "text-yellow-500", label: "Medium" },
  low: { icon: ArrowDown, color: "text-blue-500", label: "Low" },
};

type ViewMode = "kanban" | "table" | "calendar";

interface TaskWithExtras extends Task {
  assignees?: { user: User }[];
  labels?: { label: Label }[];
  checklist?: ChecklistItem[];
}

export default function BoardPage({
  boardId,
  workspaceId,
  userRole = "member",
}: BoardPageProps) {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [showCreateTask, setShowCreateTask] = useState<string | null>(null);
  const [showCreateColumn, setShowCreateColumn] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithExtras | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newColumnName, setNewColumnName] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterLabel, setFilterLabel] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [boardName, setBoardName] = useState("");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropColumnId, setDropColumnId] = useState<string | null>(null);

  const { data: board } = useQuery<BoardType>({
    queryKey: [`/api/boards/${boardId}`],
  });

  useEffect(() => {
    setBoardName(board?.name || "");
  }, [board?.name]);

  const { data: columnsData = [], isLoading: columnsLoading } = useQuery<
    Column[]
  >({
    queryKey: [`/api/boards/${boardId}/columns`],
  });

  const { data: tasksData = [] } = useQuery<TaskWithExtras[]>({
    queryKey: [`/api/boards/${boardId}/tasks`],
  });

  const { data: labels = [] } = useQuery<Label[]>({
    queryKey: [`/api/workspaces/${workspaceId}/labels`],
  });

  const { data: members = [] } = useQuery<any[]>({
    queryKey: [`/api/workspaces/${workspaceId}/members`],
  });

  const filteredTasks = useMemo(() => {
    return tasksData.filter((t) => {
      if (filterPriority !== "all" && t.priority !== filterPriority)
        return false;
      if (filterAssignee !== "all") {
        const hasAssignee = t.assignees?.some(
          (a) => a.user?.id === filterAssignee,
        );
        if (!hasAssignee) return false;
      }
      if (filterLabel !== "all") {
        const hasLabel = t.labels?.some((l) => l.label?.id === filterLabel);
        if (!hasLabel) return false;
      }
      return true;
    });
  }, [tasksData, filterPriority, filterAssignee, filterLabel]);

  const hasActiveFilters =
    filterPriority !== "all" ||
    filterAssignee !== "all" ||
    filterLabel !== "all";

  const createTaskMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      columnId: string;
      priority: string;
    }) => {
      return await apiRequest("POST", `/api/boards/${boardId}/tasks`, data);
    },
    onMutate: async (newTask) => {
      await queryClient.cancelQueries({
        queryKey: [`/api/boards/${boardId}/tasks`],
      });

      const previousTasks =
        queryClient.getQueryData<TaskWithExtras[]>([`/api/boards/${boardId}/tasks`]) || [];

      const columnTasks = previousTasks.filter(
        (task) => task.columnId === newTask.columnId,
      );
      const optimisticTask: TaskWithExtras = {
        id: `temp-${Date.now()}`,
        boardId,
        columnId: newTask.columnId,
        title: newTask.title.trim(),
        description: null,
        priority: newTask.priority,
        position:
          columnTasks.length > 0
            ? Math.max(...columnTasks.map((task) => task.position)) + 1
            : 0,
        dueDate: null,
        startDate: null,
        coverImageId: null,
        createdAt: new Date(),
        createdBy: null,
        assignees: [],
        labels: [],
        checklist: [],
      };

      queryClient.setQueryData<TaskWithExtras[]>(
        [`/api/boards/${boardId}/tasks`],
        [...previousTasks, optimisticTask],
      );

      setShowCreateTask(null);
      setNewTaskTitle("");
      setNewTaskPriority("medium");

      return { previousTasks, optimisticTaskId: optimisticTask.id };
    },
    onSuccess: (savedTask, _variables, context) => {
      queryClient.setQueryData<TaskWithExtras[]>(
        [`/api/boards/${boardId}/tasks`],
        (current = []) =>
          current.map((task) =>
            task.id === context?.optimisticTaskId
              ? {
                  ...savedTask,
                  assignees: [],
                  labels: [],
                  checklist: [],
                }
              : task,
          ),
      );

      setSelectedTask((current) =>
        current?.id === context?.optimisticTaskId
          ? {
              ...savedTask,
              assignees: current.assignees || [],
              labels: current.labels || [],
              checklist: current.checklist || [],
            }
          : current,
      );

      queryClient.invalidateQueries({
        queryKey: [`/api/workspaces/${workspaceId}/stats`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/workspaces/${workspaceId}/detailed-stats`],
      });
    },
    onError: (_error, _variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(
          [`/api/boards/${boardId}/tasks`],
          context.previousTasks,
        );
      }
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/boards/${boardId}/tasks`],
      });
    },
  });

  const updateBoardMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest("PATCH", `/api/boards/${boardId}`, { name });
    },
    onSuccess: (updatedBoard) => {
      queryClient.setQueryData([`/api/boards/${boardId}`], updatedBoard);
      queryClient.invalidateQueries({
        queryKey: ["/api/workspaces", workspaceId, "boards"],
      });
      setBoardName(updatedBoard.name || "");
    },
    onError: (err: Error) => {
      setBoardName(board?.name || "");
      toast({
        title: "Error",
        description: err.message || "Failed to update board title",
        variant: "destructive",
      });
    },
  });

  const createColumnMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      return await apiRequest("POST", `/api/boards/${boardId}/columns`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/boards/${boardId}/columns`],
      });

      setShowCreateColumn(false);
      setNewColumnName("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create column",
        variant: "destructive",
      });
    },
  });

  const deleteColumnMutation = useMutation({
    mutationFn: async (columnId: string) => {
      await apiRequest("DELETE", `/api/columns/${columnId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/boards/${boardId}/columns`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/boards/${boardId}/tasks`],
      });
    },
  });

  const moveTaskMutation = useMutation({
    mutationFn: async ({
      taskId,
      columnId,
      position,
    }: {
      taskId: string;
      columnId: string;
      position: number;
    }) => {
      await apiRequest("PATCH", `/api/tasks/${taskId}/move`, {
        columnId,
        position,
      });
    },
    onMutate: async ({ taskId, columnId, position }) => {
      await queryClient.cancelQueries({
        queryKey: [`/api/boards/${boardId}/tasks`],
      });

      const previousTasks =
        queryClient.getQueryData<TaskWithExtras[]>([`/api/boards/${boardId}/tasks`]) || [];

      const movedTask = previousTasks.find((task) => task.id === taskId);
      if (!movedTask) {
        return { previousTasks };
      }

      const updatedTasks = previousTasks.map((task) => {
        if (task.id === taskId) {
          return {
            ...task,
            columnId,
            position,
          };
        }

        return task;
      });

      queryClient.setQueryData<TaskWithExtras[]>(
        [`/api/boards/${boardId}/tasks`],
        updatedTasks,
      );

      setDraggedTaskId(null);
      setDropColumnId(null);

      return { previousTasks };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/boards/${boardId}/tasks`],
      });
    },
    onError: (_error, _variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(
          [`/api/boards/${boardId}/tasks`],
          context.previousTasks,
        );
      }
      setDraggedTaskId(null);
      setDropColumnId(null);
      toast({
        title: "Error",
        description: "Failed to move task",
        variant: "destructive",
      });
    },
  });

  const getTasksForColumn = (columnId: string) =>
    filteredTasks
      .filter((t) => t.columnId === columnId)
      .sort((a, b) => a.position - b.position);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedTaskId(taskId);
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;
    const colTasks = getTasksForColumn(columnId);
    const position =
      colTasks.length > 0
        ? Math.max(...colTasks.map((t) => t.position)) + 1
        : 0;

    if (
      tasksData.find((task) => task.id === taskId)?.columnId === columnId &&
      draggedTaskId === taskId
    ) {
      setDraggedTaskId(null);
      setDropColumnId(null);
      return;
    }

    moveTaskMutation.mutate({ taskId, columnId, position });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnterColumn = (columnId: string) => {
    if (draggedTaskId) {
      setDropColumnId(columnId);
    }
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDropColumnId(null);
  };

  const clearFilters = () => {
    setFilterPriority("all");
    setFilterAssignee("all");
    setFilterLabel("all");
  };

  const handleBoardNameSave = () => {
    const trimmedName = boardName.trim();

    if (!trimmedName) {
      setBoardName(board?.name || "");
      toast({
        title: "Board title is required",
        description: "Board title cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    if (trimmedName === (board?.name || "")) {
      if (trimmedName !== boardName) {
        setBoardName(trimmedName);
      }
      return;
    }

    updateBoardMutation.mutate(trimmedName);
  };

  if (columnsLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-72 space-y-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const getColumnForTask = (task: TaskWithExtras) =>
    columnsData.find((c) => c.id === task.columnId);

  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const calendarPadding = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  const getTasksForDate = (day: number) => {
    const date = new Date(calendarYear, calendarMonth, day);
    return filteredTasks.filter((t) => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return (
        d.getFullYear() === date.getFullYear() &&
        d.getMonth() === date.getMonth() &&
        d.getDate() === date.getDate()
      );
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between gap-4 px-6 py-3 border-b shrink-0 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
            style={{ backgroundColor: board?.coverColor || "#3b82f6" }}
          >
            <span className="text-white text-sm font-bold">
              {board?.name?.[0]?.toUpperCase()}
            </span>
          </div>
          {["owner", "admin"].includes(userRole) ? (
            <Input
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              onBlur={handleBoardNameSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="text-lg font-semibold truncate border-none p-0 h-auto focus-visible:ring-0 shadow-none bg-transparent"
              data-testid="text-board-name"
            />
          ) : (
            <h1
              className="text-lg font-semibold truncate"
              data-testid="text-board-name"
            >
              {board?.name}
            </h1>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center border rounded-md overflow-visible">
            {[
              { mode: "kanban" as ViewMode, icon: Kanban, label: "Board" },
              { mode: "table" as ViewMode, icon: Table, label: "Table" },
              {
                mode: "calendar" as ViewMode,
                icon: CalendarDays,
                label: "Calendar",
              },
            ].map((v) => (
              <Button
                key={v.mode}
                variant={viewMode === v.mode ? "default" : "ghost"}
                size="sm"
                className="rounded-none first:rounded-l-md last:rounded-r-md"
                onClick={() => setViewMode(v.mode)}
                data-testid={`button-view-${v.mode}`}
              >
                <v.icon className="w-3.5 h-3.5 mr-1" />
                {v.label}
              </Button>
            ))}
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            data-testid="button-toggle-filters"
          >
            <Filter className="w-3.5 h-3.5 mr-1" />
            Filter
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {
                  [
                    filterPriority !== "all",
                    filterAssignee !== "all",
                    filterLabel !== "all",
                  ].filter(Boolean).length
                }
              </Badge>
            )}
          </Button>
          {viewMode === "kanban" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateColumn(true)}
              data-testid="button-add-column"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Column
            </Button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="flex items-center gap-3 px-6 py-2 border-b bg-muted/30 flex-wrap">
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-32" data-testid="filter-priority">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {Object.entries(PRIORITY_CONFIG).map(([key, conf]) => (
                <SelectItem key={key} value={key}>
                  {conf.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-36" data-testid="filter-assignee">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              {members.map((m: any) => (
                <SelectItem key={m.user?.id} value={m.user?.id || ""}>
                  {[m.user?.firstName, m.user?.lastName]
                    .filter(Boolean)
                    .join(" ") || "User"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterLabel} onValueChange={setFilterLabel}>
            <SelectTrigger className="w-32" data-testid="filter-label">
              <SelectValue placeholder="Label" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Labels</SelectItem>
              {labels.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              data-testid="button-clear-filters"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Clear
            </Button>
          )}
        </div>
      )}

      {viewMode === "kanban" && (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-4 p-6 h-full items-start">
            {columnsData.map((column) => {
              const colTasks = getTasksForColumn(column.id);
              return (
                <div
                  key={column.id}
                  className={`w-72 shrink-0 flex flex-col max-h-full rounded-lg transition-colors ${
                    dropColumnId === column.id ? "bg-muted/40" : ""
                  }`}
                  onDrop={(e) => handleDrop(e, column.id)}
                  onDragOver={handleDragOver}
                  onDragEnter={() => handleDragEnterColumn(column.id)}
                >
                  <div className="flex items-center justify-between gap-2 mb-3 px-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: column.color || "#6b7280" }}
                      />
                      <span
                        className="text-sm font-medium truncate"
                        data-testid={`text-column-${column.id}`}
                      >
                        {column.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] shrink-0"
                      >
                        {colTasks.length}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setShowCreateTask(column.id);
                          setNewTaskTitle("");
                        }}
                        data-testid={`button-add-task-${column.id}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() =>
                              deleteColumnMutation.mutate(column.id)
                            }
                            data-testid={`button-delete-column-${column.id}`}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete column
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[100px]">
                    {colTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onClick={() => {
                          if (task.id.startsWith("temp-")) return;
                          setSelectedTask(task);
                        }}
                        isDragging={draggedTaskId === task.id}
                      />
                    ))}

                    {showCreateTask === column.id && (
                      <Card className="p-3">
                        <Input
                          placeholder="Task title..."
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newTaskTitle.trim()) {
                              createTaskMutation.mutate({
                                title: newTaskTitle.trim(),
                                columnId: column.id,
                                priority: newTaskPriority,
                              });
                            }
                            if (e.key === "Escape") setShowCreateTask(null);
                          }}
                          autoFocus
                          data-testid={`input-new-task-${column.id}`}
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <Select
                            value={newTaskPriority}
                            onValueChange={setNewTaskPriority}
                          >
                            <SelectTrigger
                              className="h-7 text-xs w-24"
                              data-testid="select-task-priority"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="flex-1" />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowCreateTask(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            disabled={
                              !newTaskTitle.trim() ||
                              createTaskMutation.isPending
                            }
                            onClick={() => {
                              if (newTaskTitle.trim()) {
                                createTaskMutation.mutate({
                                  title: newTaskTitle.trim(),
                                  columnId: column.id,
                                  priority: newTaskPriority,
                                });
                              }
                            }}
                            data-testid={`button-submit-task-${column.id}`}
                          >
                            Add
                          </Button>
                        </div>
                      </Card>
                    )}
                  </div>

                  {showCreateTask !== column.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 text-muted-foreground justify-start"
                      onClick={() => {
                        setShowCreateTask(column.id);
                        setNewTaskTitle("");
                      }}
                      data-testid={`button-add-task-bottom-${column.id}`}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add task
                    </Button>
                  )}
                </div>
              );
            })}

            <div className="w-72 shrink-0">
              {showCreateColumn ? (
                <Card className="p-3">
                  <Input
                    placeholder="Column name..."
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newColumnName.trim()) {
                        createColumnMutation.mutate({
                          name: newColumnName.trim(),
                        });
                      }
                      if (e.key === "Escape") setShowCreateColumn(false);
                    }}
                    autoFocus
                    data-testid="input-new-column"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowCreateColumn(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={
                        !newColumnName.trim() || createColumnMutation.isPending
                      }
                      onClick={() => {
                        if (newColumnName.trim()) {
                          createColumnMutation.mutate({
                            name: newColumnName.trim(),
                          });
                        }
                      }}
                      data-testid="button-submit-column"
                    >
                      Add Column
                    </Button>
                  </div>
                </Card>
              ) : (
                <Button
                  variant="outline"
                  className="w-full border-dashed text-muted-foreground"
                  onClick={() => setShowCreateColumn(true)}
                  data-testid="button-add-column-inline"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Column
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {viewMode === "table" && (
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[700px]" data-testid="table-view">
            <thead className="sticky top-0 z-10 bg-background border-b">
              <tr>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-[300px]">
                  Task
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-[120px]">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-[100px]">
                  Priority
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-[100px]">
                  Assignees
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-[120px]">
                  Due Date
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Labels
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => {
                const col = getColumnForTask(task);
                const pConf = PRIORITY_CONFIG[task.priority || "medium"];
                const PIcon = pConf?.icon || Minus;
                return (
                  <tr
                    key={task.id}
                    className="border-b hover-elevate cursor-pointer"
                    onClick={() => setSelectedTask(task)}
                    data-testid={`table-row-${task.id}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {task.checklist && task.checklist.length > 0 && (
                          <CheckSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-sm font-medium truncate">
                          {task.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-[10px]">
                        <div
                          className="w-1.5 h-1.5 rounded-full mr-1 shrink-0"
                          style={{ backgroundColor: col?.color || "#6b7280" }}
                        />
                        {col?.name || "Unknown"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`flex items-center gap-1 text-xs ${pConf?.color || ""}`}
                      >
                        <PIcon className="w-3 h-3" />
                        {pConf?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex -space-x-1">
                        {task.assignees?.slice(0, 3).map((a: any) => (
                          <Avatar
                            key={a.user?.id}
                            className="w-5 h-5 border-2 border-background"
                          >
                            <AvatarImage
                              src={a.user?.profileImageUrl || undefined}
                            />
                            <AvatarFallback className="text-[8px]">
                              {a.user?.firstName?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {task.dueDate ? (
                        <span className="text-xs text-muted-foreground">
                          {new Date(task.dueDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">
                          --
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {task.labels?.map((tl: any) => (
                          <Badge
                            key={tl.label?.id}
                            variant="secondary"
                            className="text-[10px] gap-1"
                          >
                            <div
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: tl.label?.color }}
                            />
                            {tl.label?.name}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredTasks.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-12 text-sm text-muted-foreground"
                  >
                    No tasks found{hasActiveFilters ? " matching filters" : ""}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === "calendar" && (
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setCalendarDate(new Date(calendarYear, calendarMonth - 1, 1))
              }
              data-testid="button-calendar-prev"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2
              className="text-base font-semibold"
              data-testid="text-calendar-month"
            >
              {calendarDate.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setCalendarDate(new Date(calendarYear, calendarMonth + 1, 1))
              }
              data-testid="button-calendar-next"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div
            className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden"
            data-testid="calendar-view"
          >
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="bg-muted/50 text-center text-xs font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
            {calendarPadding.map((i) => (
              <div key={`pad-${i}`} className="bg-background min-h-[100px]" />
            ))}
            {calendarDays.map((day) => {
              const dayTasks = getTasksForDate(day);
              const isToday =
                day === new Date().getDate() &&
                calendarMonth === new Date().getMonth() &&
                calendarYear === new Date().getFullYear();
              return (
                <div
                  key={day}
                  className={`bg-background min-h-[100px] p-1.5 ${isToday ? "ring-1 ring-inset ring-primary" : ""}`}
                  data-testid={`calendar-day-${day}`}
                >
                  <span
                    className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {day}
                  </span>
                  <div className="space-y-0.5 mt-1">
                    {dayTasks.slice(0, 3).map((task) => {
                      const pConf = PRIORITY_CONFIG[task.priority || "medium"];
                      return (
                        <button
                          key={task.id}
                          className="w-full text-left text-[11px] px-1 py-0.5 rounded truncate hover-elevate bg-muted/50"
                          onClick={() => setSelectedTask(task)}
                          data-testid={`calendar-task-${task.id}`}
                        >
                          <span
                            className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${pConf?.color?.replace("text-", "bg-") || "bg-yellow-500"}`}
                          />
                          {task.title}
                        </button>
                      );
                    })}
                    {dayTasks.length > 3 && (
                      <span className="text-[10px] text-muted-foreground px-1">
                        +{dayTasks.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedTask && (
        <TaskDetailDialog
          taskId={selectedTask.id}
          boardId={boardId}
          workspaceId={workspaceId}
          labels={labels}
          userRole={userRole}
          open={!!selectedTask}
          onOpenChange={(open) => {
            if (!open) setSelectedTask(null);
          }}
        />
      )}
    </div>
  );
}

function TaskCard({
  task,
  onDragStart,
  onDragEnd,
  onClick,
  isDragging,
}: {
  task: TaskWithExtras;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragEnd: () => void;
  onClick: () => void;
  isDragging: boolean;
}) {
  const priorityConf = PRIORITY_CONFIG[task.priority || "medium"];
  const PriorityIcon = priorityConf?.icon || Minus;
  const checklistTotal = task.checklist?.length || 0;
  const checklistDone = task.checklist?.filter((c) => c.completed).length || 0;

  return (
    <Card
      className={`cursor-pointer hover-elevate overflow-visible transition-opacity ${
        isDragging ? "opacity-50" : ""
      }`}
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      data-testid={`card-task-${task.id}`}
    >
      {task.coverImageId && (
        <div className="h-24 rounded-t-md overflow-hidden">
          <img
            src={`/api/attachments/${task.coverImageId}/download`}
            alt="Cover"
            className="w-full h-full object-cover"
            data-testid={`img-cover-${task.id}`}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}
      <div className="flex items-start gap-2 p-3">
        <GripVertical className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0 cursor-grab" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{task.title}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span
              className={`flex items-center gap-1 text-xs ${priorityConf?.color || ""}`}
            >
              <PriorityIcon className="w-3 h-3" />
              {priorityConf?.label}
            </span>
            {task.dueDate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                {new Date(task.dueDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
            {checklistTotal > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckSquare className="w-3 h-3" />
                {checklistDone}/{checklistTotal}
              </span>
            )}
          </div>
          {task.assignees && task.assignees.length > 0 && (
            <div className="flex -space-x-1 mt-2">
              {task.assignees.slice(0, 3).map((a: any) => (
                <Avatar
                  key={a.user?.id}
                  className="w-5 h-5 border-2 border-background"
                >
                  <AvatarImage src={a.user?.profileImageUrl || undefined} />
                  <AvatarFallback className="text-[8px]">
                    {a.user?.firstName?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          )}
          {task.labels && task.labels.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {task.labels.map((tl: any) => (
                <div
                  key={tl.label?.id}
                  className="h-1.5 w-6 rounded-full"
                  style={{ backgroundColor: tl.label?.color || "#3b82f6" }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
