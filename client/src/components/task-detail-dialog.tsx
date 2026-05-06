import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest, apiRequestFormData } from "@/lib/queryClient";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Trash2,
  Send,
  ArrowUp,
  ArrowDown,
  Minus,
  Flag,
  Tag,
  Users,
  CheckSquare,
  Plus,
  X,
  Activity,
  Paperclip,
  Download,
  ImageIcon,
  FileText,
  Upload,
} from "lucide-react";
import type {
  Task,
  Label,
  Comment,
  WorkspaceMember,
  ChecklistItem,
  ActivityLog,
  Attachment,
} from "@shared/schema";
import type { User } from "@shared/models/auth";

type TaskWithRelations = Task & {
  labels?: { label: Label }[];
  assignees?: { user: User }[];
  checklist?: ChecklistItem[];
};

interface TaskDetailDialogProps {
  taskId: string;
  boardId: string;
  workspaceId: string;
  labels: Label[];
  userRole?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

// Dropdown pakai position:fixed supaya bisa keluar dari ScrollArea yang overflow:hidden
function FixedDropdown({
  anchorRef,
  open,
  children,
}: {
  anchorRef: React.RefObject<HTMLDivElement>;
  open: boolean;
  children: React.ReactNode;
}) {
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (open && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 4, left: rect.left });
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="rounded-md border bg-popover shadow-md p-2 space-y-1"
      style={{
        position: "fixed",
        top: coords.top,
        left: coords.left,
        width: 224,
        zIndex: 99999,
      }}
    >
      {children}
    </div>
  );
}

export function TaskDetailDialog({
  taskId,
  boardId,
  workspaceId,
  labels,
  userRole = "member",
  open,
  onOpenChange,
}: TaskDetailDialogProps) {
  const { toast } = useToast();
  const boardTasksQueryKey = [`/api/boards/${boardId}/tasks`];
  const { data: task, refetch: refetchTask } = useQuery<TaskWithRelations>({
    queryKey: ["/api/tasks", taskId],
    queryFn: () => apiRequest("GET", `/api/tasks/${taskId}`),
    enabled: open && !!taskId,
  });
  useEffect(() => {
    if (open && taskId) {
      refetchTask();
    }
  }, [open, taskId]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [commentText, setCommentText] = useState("");
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "activity">("details");
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [assigneesOpen, setAssigneesOpen] = useState(false);
  const labelsRef = useRef<HTMLDivElement>(null);
  const assigneesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (labelsRef.current && !labelsRef.current.contains(e.target as Node)) {
        setLabelsOpen(false);
      }
      if (
        assigneesRef.current &&
        !assigneesRef.current.contains(e.target as Node)
      ) {
        setAssigneesOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description || "");
    setPriority(task.priority || "medium");
  }, [task]);

  const { data: comments = [] } = useQuery<(Comment & { user: User })[]>({
    queryKey: ["/api/tasks", taskId, "comments"],
    queryFn: () => apiRequest("GET", `/api/tasks/${taskId}/comments`),
    enabled: open && !!taskId,
  });

  const { data: members = [] } = useQuery<(WorkspaceMember & { user: User })[]>(
    {
      queryKey: ["/api/workspaces", workspaceId, "members"],
      queryFn: () =>
        apiRequest("GET", `/api/workspaces/${workspaceId}/members`),
      enabled: open && !!workspaceId,
    },
  );

  const { data: checklistData = [] } = useQuery<ChecklistItem[]>({
    queryKey: ["/api/tasks", taskId, "checklist"],
    queryFn: () => apiRequest("GET", `/api/tasks/${taskId}/checklist`),
    enabled: open && !!taskId,
  });

  const { data: activityData = [] } = useQuery<
    (ActivityLog & { user: User })[]
  >({
    queryKey: ["/api/tasks", taskId, "activity"],
    queryFn: () => apiRequest("GET", `/api/tasks/${taskId}/activity`),
    enabled: open && activeTab === "activity",
  });

  const { data: attachments = [] } = useQuery<Attachment[]>({
    queryKey: ["/api/tasks", taskId, "attachments"],
    queryFn: () => apiRequest("GET", `/api/tasks/${taskId}/attachments`),
    enabled: open && !!taskId,
  });

  const checklist =
    checklistData.length > 0 ? checklistData : task?.checklist || [];
  const completedCount = checklist.filter((c) => c.completed).length;

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Task>) => {
      return apiRequest<TaskWithRelations>("PATCH", `/api/tasks/${taskId}`, data);
    },
    onSuccess: (updatedTask) => {
      queryClient.setQueryData(["/api/tasks", taskId], updatedTask);
      queryClient.setQueryData<TaskWithRelations[]>(boardTasksQueryKey, (current = []) =>
        current.map((item) =>
          item.id === taskId
            ? {
                ...item,
                ...updatedTask,
                assignees: updatedTask.assignees ?? item.assignees,
                labels: updatedTask.labels ?? item.labels,
                checklist: updatedTask.checklist ?? item.checklist,
              }
            : item,
        ),
      );
      queryClient.invalidateQueries({ queryKey: boardTasksQueryKey });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.setQueryData<TaskWithRelations[]>(
        boardTasksQueryKey,
        (current = []) => current.filter((item) => item.id !== taskId),
      );
      queryClient.invalidateQueries({
        queryKey: boardTasksQueryKey,
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/workspaces", workspaceId, "stats"],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/workspaces/${workspaceId}/detailed-stats`],
      });
      queryClient.removeQueries({ queryKey: ["/api/tasks", taskId] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message || "Failed to delete task",
        variant: "destructive",
      });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", `/api/tasks/${taskId}/comments`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/tasks", taskId, "comments"],
      });
      setCommentText("");
    },
  });

  const addLabelMutation = useMutation({
    mutationFn: async (labelId: string) => {
      await apiRequest("POST", `/api/tasks/${taskId}/labels`, { labelId });
    },
    onMutate: (labelId) => {
      setSelectedLabelIds((prev) => {
        const s = new Set(prev);
        s.add(labelId);
        return s;
      }); // ← update local state langsung
    },
    onError: (_, labelId) => {
      setSelectedLabelIds((prev) => {
        const s = new Set(prev);
        s.delete(labelId);
        return s;
      }); // ← rollback
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: boardTasksQueryKey,
        refetchType: "all",
      });
    },
  });

  const removeLabelMutation = useMutation({
    mutationFn: async (labelId: string) => {
      await apiRequest("DELETE", `/api/tasks/${taskId}/labels/${labelId}`);
    },
    onMutate: (labelId) => {
      setSelectedLabelIds((prev) => {
        const s = new Set(prev);
        s.delete(labelId);
        return s;
      });
    },
    onError: (_, labelId) => {
      setSelectedLabelIds((prev) => {
        const s = new Set(prev);
        s.add(labelId);
        return s;
      }); // ← rollback
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: boardTasksQueryKey,
        refetchType: "all",
      });
    },
  });

  const addAssigneeMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("POST", `/api/tasks/${taskId}/assignees`, { userId });
    },
    onMutate: (userId) => {
      setSelectedAssigneeIds((prev) => {
        const s = new Set(prev);
        s.add(userId);
        return s;
      });
    },
    onError: (_, userId) => {
      setSelectedAssigneeIds((prev) => {
        const s = new Set(prev);
        s.delete(userId);
        return s;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: boardTasksQueryKey,
        refetchType: "all",
      });
    },
  });

  const removeAssigneeMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/tasks/${taskId}/assignees/${userId}`);
    },
    onMutate: (userId) => {
      setSelectedAssigneeIds((prev) => {
        const s = new Set(prev);
        s.delete(userId);
        return s;
      });
    },
    onError: (_, userId) => {
      setSelectedAssigneeIds((prev) => {
        const s = new Set(prev);
        s.add(userId);
        return s;
      }); // ← rollback
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: boardTasksQueryKey,
        refetchType: "all",
      });
    },
  });

  const addChecklistMutation = useMutation({
    mutationFn: async (title: string) => {
      await apiRequest("POST", `/api/tasks/${taskId}/checklist`, { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/tasks", taskId, "checklist"],
      });
      queryClient.invalidateQueries({
        queryKey: boardTasksQueryKey,
      });
      setNewChecklistTitle("");
    },
  });

  const toggleChecklistMutation = useMutation({
    mutationFn: async ({
      id,
      completed,
    }: {
      id: string;
      completed: boolean;
    }) => {
      await apiRequest("PATCH", `/api/checklist/${id}`, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/tasks", taskId, "checklist"],
      });
      queryClient.invalidateQueries({
        queryKey: boardTasksQueryKey,
      });
    },
  });

  const deleteChecklistMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/checklist/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/tasks", taskId, "checklist"],
      });
      queryClient.invalidateQueries({
        queryKey: boardTasksQueryKey,
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiRequestFormData("POST", `/api/tasks/${taskId}/attachments`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/tasks", taskId, "attachments"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/tasks", taskId, "activity"],
      });
      toast({ title: "File uploaded" });
    },
    onError: (err: Error) => {
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/attachments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/tasks", taskId, "attachments"],
      });
    },
  });

  const setCoverMutation = useMutation({
    mutationFn: async (coverImageId: string | null) => {
      await apiRequest("PATCH", `/api/tasks/${taskId}`, { coverImageId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: boardTasksQueryKey,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId] });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) Array.from(files).forEach((file) => uploadMutation.mutate(file));
    e.target.value = "";
  };

  const isImageAttachment = (att: Attachment) =>
    att.mimeType?.startsWith("image/");

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderMentions = (text: string) => {
    const parts = text.split(/(@\[[^\]]+\]\([^)]+\))/g);
    return parts.map((part, i) => {
      const match = part.match(/@\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        return (
          <span
            key={i}
            className="font-medium text-foreground"
            data-testid={`mention-${match[2]}`}
          >
            @{match[1]}
          </span>
        );
      }
      return part;
    });
  };

  const handleSave = () => {
    if (!task) {
      return;
    }

    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setTitle(task?.title || "");
      toast({
        title: "Title is required",
        description: "Task title cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    if (trimmedTitle === (task?.title || "")) {
      if (trimmedTitle !== title) {
        setTitle(trimmedTitle);
      }
      return;
    }

    updateMutation.mutate({
      title: trimmedTitle,
    });
  };

  const handleDescriptionBlur = () => {
    if (description !== (task?.description || "")) {
      updateMutation.mutate({ description: description || null });
    }
  };

  const [selectedLabelIds, setSelectedLabelIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<Set<string>>(
    new Set(),
  );

  // Sync dari task data ketika task berubah
  useEffect(() => {
    if (!task) return;
    console.log("task data:", task);
    console.log("task.labels:", task.labels);
    console.log("task.assignees:", task.assignees);
    setSelectedLabelIds(
      new Set(
        (task.labels?.map((tl) => tl.label?.id).filter(Boolean) as string[]) ||
          [],
      ),
    );
    setSelectedAssigneeIds(
      new Set(
        (task.assignees?.map((a) => a.user?.id).filter(Boolean) as string[]) ||
          [],
      ),
    );
  }, [task]);

  const formatActivityAction = (log: ActivityLog & { user: User }) => {
    const name =
      [log.user?.firstName, log.user?.lastName].filter(Boolean).join(" ") ||
      "Someone";
    const meta = log.metadata as any;
    switch (log.action) {
      case "created":
        return `${name} created this task`;
      case "updated":
        return `${name} updated ${meta?.fields?.join(", ") || "this task"}`;
      case "moved":
        return `${name} moved this task`;
      case "assigned":
        return `${name} assigned someone`;
      case "commented":
        return `${name} commented`;
      default:
        return `${name} ${log.action}`;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="p-0 flex flex-col sm:max-w-xl z-50 pointer-events-auto"
        data-testid="task-detail-drawer"
      >
        <SheetHeader className="px-6 pt-6 pb-0 shrink-0">
          <div className="pr-8">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSave();
                }
              }}
              className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0 shadow-none"
              data-testid="input-task-title"
            />
            <SheetDescription className="sr-only">
              Task details
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="flex border-b px-6 gap-1 shrink-0">
          <button
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "details" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
            onClick={() => setActiveTab("details")}
            data-testid="tab-details"
          >
            Details
          </button>
          <button
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "activity" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
            onClick={() => setActiveTab("activity")}
            data-testid="tab-activity"
          >
            <Activity className="w-3.5 h-3.5 inline mr-1" />
            Activity
          </button>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto">
          {activeTab === "details" ? (
            <div className="px-6 py-4 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
                    Priority
                  </label>
                  <Select
                    value={priority}
                    onValueChange={(val) => {
                      setPriority(val);
                      updateMutation.mutate({ priority: val });
                    }}
                  >
                    <SelectTrigger data-testid="select-detail-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_CONFIG).map(([key, conf]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <conf.icon
                              className={`w-3.5 h-3.5 ${conf.color}`}
                            />
                            {conf.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
                    Due Date
                  </label>
                  <Input
                    type="date"
                    defaultValue={
                      task?.dueDate
                        ? new Date(task.dueDate).toISOString().split("T")[0]
                        : ""
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      updateMutation.mutate({
                        dueDate: val ? new Date(val) : null,
                      });
                    }}
                    data-testid="input-due-date"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
                  Description
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleDescriptionBlur}
                  placeholder="Add a description..."
                  className="min-h-[80px] resize-none"
                  data-testid="textarea-description"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <Paperclip className="w-3 h-3" /> Attachments
                  </label>
                  <label
                    htmlFor={`file-upload-${taskId}`}
                    className="cursor-pointer"
                  >
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        <Upload className="w-3.5 h-3.5 mr-1" />
                        Upload
                      </span>
                    </Button>
                    <input
                      id={`file-upload-${taskId}`}
                      type="file"
                      className="hidden"
                      multiple
                      onChange={handleFileUpload}
                      data-testid="input-file-upload"
                    />
                  </label>
                </div>
                {uploadMutation.isPending && (
                  <div className="text-xs text-muted-foreground py-2">
                    Uploading...
                  </div>
                )}
                {attachments.length > 0 ? (
                  <div className="space-y-1.5">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center gap-2 p-2 rounded-md border text-sm group"
                        data-testid={`attachment-${att.id}`}
                      >
                        {isImageAttachment(att) ? (
                          <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="truncate flex-1">
                          {att.originalName}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatFileSize(att.size)}
                        </span>
                        <div className="flex gap-0.5 shrink-0">
                          {isImageAttachment(att) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="invisible group-hover:visible"
                              onClick={() => setCoverMutation.mutate(att.id)}
                              title="Set as cover"
                              data-testid={`button-set-cover-${att.id}`}
                            >
                              <ImageIcon className="w-3 h-3" />
                            </Button>
                          )}
                          <a
                            href={`/api/attachments/${att.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="invisible group-hover:visible"
                              data-testid={`button-download-${att.id}`}
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </a>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="invisible group-hover:visible"
                            onClick={() =>
                              deleteAttachmentMutation.mutate(att.id)
                            }
                            data-testid={`button-delete-attachment-${att.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No attachments
                  </p>
                )}
                {task?.coverImageId && (
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs gap-1">
                      <ImageIcon className="w-3 h-3" />
                      Cover image set
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => setCoverMutation.mutate(null)}
                      data-testid="button-remove-cover"
                    >
                      Remove cover
                    </Button>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex gap-4 flex-wrap">
                {/* LABELS */}
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1.5 flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Labels
                  </label>
                  <div ref={labelsRef}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLabelsOpen((v) => !v)}
                      data-testid="button-manage-labels"
                    >
                      <Tag className="w-3.5 h-3.5 mr-1" />
                      {selectedLabelIds.size > 0
                        ? `${selectedLabelIds.size} labels`
                        : "Add labels"}
                    </Button>
                    <FixedDropdown anchorRef={labelsRef} open={labelsOpen}>
                      {labels.map((label) => {
                        const isSelected = selectedLabelIds.has(label.id);
                        return (
                          <button
                            type="button"
                            key={label.id}
                            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-accent cursor-pointer"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              if (isSelected)
                                removeLabelMutation.mutate(label.id);
                              else addLabelMutation.mutate(label.id);
                            }}
                            data-testid={`toggle-label-${label.id}`}
                          >
                            <div className="w-4 h-4 border border-muted-foreground rounded flex items-center justify-center shrink-0">
                              {isSelected && (
                                <div className="w-2 h-2 bg-primary rounded-sm" />
                              )}
                            </div>
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: label.color }}
                            />
                            <span className="truncate">{label.name}</span>
                          </button>
                        );
                      })}
                      {labels.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          No labels. Create them in Settings.
                        </p>
                      )}
                    </FixedDropdown>
                  </div>
                  {selectedLabelIds.size > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {labels
                        .filter((l) => selectedLabelIds.has(l.id))
                        .map((label) => (
                          <Badge
                            key={label.id}
                            variant="secondary"
                            className="text-xs gap-1"
                          >
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: label.color }}
                            />
                            {label.name}
                          </Badge>
                        ))}
                    </div>
                  )}
                </div>

                {/* ASSIGNEES */}
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1.5 flex items-center gap-1">
                    <Users className="w-3 h-3" /> Assignees
                  </label>
                  <div ref={assigneesRef}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAssigneesOpen((v) => !v)}
                      data-testid="button-manage-assignees"
                    >
                      <Users className="w-3.5 h-3.5 mr-1" />
                      {selectedAssigneeIds.size > 0
                        ? `${selectedAssigneeIds.size} assigned`
                        : "Assign"}
                    </Button>
                    <FixedDropdown
                      anchorRef={assigneesRef}
                      open={assigneesOpen}
                    >
                      {members.map((member) => {
                        const isAssigned = selectedAssigneeIds.has(
                          member.user?.id,
                        );
                        return (
                          <button
                            type="button"
                            key={member.user?.id}
                            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-accent cursor-pointer"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              if (isAssigned)
                                removeAssigneeMutation.mutate(member.user?.id!);
                              else addAssigneeMutation.mutate(member.user?.id!);
                            }}
                            data-testid={`toggle-assignee-${member.user?.id}`}
                          >
                            <div className="w-4 h-4 border border-muted-foreground rounded flex items-center justify-center shrink-0">
                              {isAssigned && (
                                <div className="w-2 h-2 bg-primary rounded-sm" />
                              )}
                            </div>
                            <Avatar className="w-5 h-5">
                              <AvatarImage
                                src={member.user?.profileImageUrl || undefined}
                              />
                              <AvatarFallback className="text-[8px]">
                                {member.user?.firstName?.[0] || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">
                              {[member.user?.firstName, member.user?.lastName]
                                .filter(Boolean)
                                .join(" ") || "User"}
                            </span>
                          </button>
                        );
                      })}
                    </FixedDropdown>
                  </div>
                  {selectedAssigneeIds.size > 0 && (
                    <div className="flex -space-x-1 mt-2">
                      {members
                        .filter((m) => selectedAssigneeIds.has(m.user?.id))
                        .map((m) => (
                          <Avatar
                            key={m.user?.id}
                            className="w-6 h-6 border-2 border-background"
                          >
                            <AvatarImage
                              src={m.user?.profileImageUrl || undefined}
                            />
                            <AvatarFallback className="text-[8px]">
                              {m.user?.firstName?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckSquare className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Checklist</span>
                  {checklist.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {completedCount}/{checklist.length}
                    </span>
                  )}
                </div>
                {checklist.length > 0 && (
                  <div className="w-full h-1.5 rounded-full bg-muted mb-3">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${(completedCount / checklist.length) * 100}%`,
                      }}
                    />
                  </div>
                )}
                <div className="space-y-1 mb-3">
                  {checklist?.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 group"
                      data-testid={`checklist-item-${item.id}`}
                    >
                      <Checkbox
                        checked={item.completed}
                        onCheckedChange={(checked) =>
                          toggleChecklistMutation.mutate({
                            id: item.id,
                            completed: !!checked,
                          })
                        }
                        data-testid={`checkbox-checklist-${item.id}`}
                      />
                      <span
                        className={`text-sm flex-1 ${item.completed ? "line-through text-muted-foreground" : ""}`}
                      >
                        {item.title}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="invisible group-hover:visible"
                        onClick={() => deleteChecklistMutation.mutate(item.id)}
                        data-testid={`button-delete-checklist-${item.id}`}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add checklist item..."
                    value={newChecklistTitle}
                    onChange={(e) => setNewChecklistTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newChecklistTitle.trim())
                        addChecklistMutation.mutate(newChecklistTitle.trim());
                    }}
                    className="text-sm"
                    data-testid="input-checklist-item"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      !newChecklistTitle.trim() ||
                      addChecklistMutation.isPending
                    }
                    onClick={() => {
                      if (newChecklistTitle.trim())
                        addChecklistMutation.mutate(newChecklistTitle.trim());
                    }}
                    data-testid="button-add-checklist"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Comments</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {comments.length}
                  </Badge>
                </div>
                <div className="space-y-3 mb-4">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="flex gap-3"
                      data-testid={`comment-${comment.id}`}
                    >
                      <Avatar className="w-7 h-7 shrink-0 mt-0.5">
                        <AvatarImage
                          src={comment.user?.profileImageUrl || undefined}
                        />
                        <AvatarFallback className="text-[10px]">
                          {comment.user?.firstName?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium">
                            {[comment.user?.firstName, comment.user?.lastName]
                              .filter(Boolean)
                              .join(" ") || "User"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {comment.createdAt
                              ? new Date(comment.createdAt).toLocaleDateString()
                              : ""}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {renderMentions(comment.content)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-3">
                      No comments yet
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Write a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && commentText.trim())
                        addCommentMutation.mutate(commentText.trim());
                    }}
                    data-testid="input-comment"
                  />
                  <Button
                    size="icon"
                    disabled={
                      !commentText.trim() || addCommentMutation.isPending
                    }
                    onClick={() => {
                      if (commentText.trim())
                        addCommentMutation.mutate(commentText.trim());
                    }}
                    data-testid="button-submit-comment"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              {["owner", "admin"].includes(userRole) && (
                <div className="flex justify-end pb-4">
                  <Button
                    variant="destructive"
                    size="sm"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    data-testid="button-delete-task"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete Task
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="px-6 py-4 space-y-3">
              {activityData.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No activity recorded yet
                </p>
              )}
              {activityData.map((log) => (
                <div
                  key={log.id}
                  className="flex gap-3 items-start"
                  data-testid={`activity-${log.id}`}
                >
                  <Avatar className="w-6 h-6 shrink-0 mt-0.5">
                    <AvatarImage src={log.user?.profileImageUrl || undefined} />
                    <AvatarFallback className="text-[8px]">
                      {log.user?.firstName?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{formatActivityAction(log)}</p>
                    <span className="text-xs text-muted-foreground">
                      {log.createdAt
                        ? new Date(log.createdAt).toLocaleString()
                        : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
