import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  HelpCircle,
  Plus,
  Send,
  Clock,
  BarChart3,
  Users,
  AlertCircle,
  CheckCircle2,
  Bell,
} from "lucide-react";
import type { User } from "@shared/models/auth";

interface Question {
  id: string;
  workspaceId: string;
  creatorId: string;
  title: string;
  description?: string | null;
  type: string;
  options: string[] | null;
  dueAt?: string | null;
  status: string;
  reminderEnabled: boolean;
  createdAt: string | null;
  creator?: User;
  responseCount?: number;
}

interface QuestionResponse {
  id: string;
  questionId: string;
  userId: string;
  response: string;
  createdAt: string | null;
  user: User;
}

interface QuestionDetail extends Question {
  responses: QuestionResponse[];
  hasResponded: boolean;
  totalMembers: number;
  responseRate: number;
}

interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: string;
  user: User;
}

const TYPE_LABELS: Record<string, string> = {
  short_answer: "Short Answer",
  multiple_choice: "Multiple Choice",
  poll: "Poll",
};

const TYPE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  short_answer: "secondary",
  multiple_choice: "default",
  poll: "outline",
};

function CreateQuestionDialog({
  workspaceId,
  open,
  onOpenChange,
}: {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("short_answer");
  const [options, setOptions] = useState<string[]>([""]);
  const [dueAt, setDueAt] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { title, type };
      if (description.trim()) body.description = description;
      if (type !== "short_answer" && options.filter((o) => o.trim()).length > 0) {
        body.options = options.filter((o) => o.trim());
      }
      if (dueAt) body.dueAt = dueAt;
      await apiRequest("POST", `/api/workspaces/${workspaceId}/questions`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces", workspaceId, "questions"] });
      toast({ title: "Question created" });
      onOpenChange(false);
      setTitle("");
      setDescription("");
      setType("short_answer");
      setOptions([""]);
      setDueAt("");
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create question", description: err.message, variant: "destructive" });
    },
  });

  const addOption = () => setOptions([...options, ""]);
  const updateOption = (idx: number, val: string) => {
    const next = [...options];
    next[idx] = val;
    setOptions(next);
  };
  const removeOption = (idx: number) => setOptions(options.filter((_, i) => i !== idx));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Question</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="q-title">Title</Label>
            <Input
              id="q-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter question title"
              data-testid="input-question-title"
            />
          </div>
          <div>
            <Label htmlFor="q-desc">Description (optional)</Label>
            <Textarea
              id="q-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more context..."
              data-testid="input-question-description"
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger data-testid="select-question-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short_answer">Short Answer</SelectItem>
                <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                <SelectItem value="poll">Poll</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(type === "multiple_choice" || type === "poll") && (
            <div className="space-y-2">
              <Label>Options</Label>
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={opt}
                    onChange={(e) => updateOption(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    data-testid={`input-option-${idx}`}
                  />
                  {options.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(idx)}
                      data-testid={`button-remove-option-${idx}`}
                    >
                      <AlertCircle className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addOption} data-testid="button-add-option">
                <Plus className="w-4 h-4 mr-1" />
                Add Option
              </Button>
            </div>
          )}
          <div>
            <Label htmlFor="q-due">Due Date (optional)</Label>
            <Input
              id="q-due"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              data-testid="input-question-due"
            />
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!title.trim() || createMutation.isPending}
            className="w-full"
            data-testid="button-submit-question"
          >
            {createMutation.isPending ? "Creating..." : "Create Question"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function QuestionDetailDialog({
  questionId,
  isAdmin,
}: {
  questionId: string;
  isAdmin: boolean;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [responseText, setResponseText] = useState("");
  const [selectedOption, setSelectedOption] = useState("");

  const { data: detail, isLoading } = useQuery<QuestionDetail>({
    queryKey: ["/api/questions", questionId],
  });

  const respondMutation = useMutation({
    mutationFn: async () => {
      const value = detail?.type === "short_answer" ? responseText : selectedOption;
      await apiRequest("POST", `/api/questions/${questionId}/responses`, { response: value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions", questionId] });
      toast({ title: "Response submitted" });
      setResponseText("");
      setSelectedOption("");
    },
    onError: (err: Error) => {
      toast({ title: "Failed to submit response", description: err.message, variant: "destructive" });
    },
  });

  const remindMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/questions/${questionId}/remind`);
    },
    onSuccess: () => {
      toast({ title: "Reminders sent" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to send reminders", description: err.message, variant: "destructive" });
    },
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/questions/${questionId}`, { status: "closed" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions", questionId] });
      toast({ title: "Question closed" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to close question", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!detail) return null;

  const isClosed = detail.status === "closed";
  const canRespond = !detail.hasResponded && !isClosed;
  const responseValue = detail.type === "short_answer" ? responseText : selectedOption;

  const optionCounts: Record<string, number> = {};
  if (detail.options && (detail.type === "multiple_choice" || detail.type === "poll")) {
    for (const opt of detail.options) {
      optionCounts[opt] = 0;
    }
    for (const r of detail.responses) {
      if (optionCounts[r.response] !== undefined) {
        optionCounts[r.response]++;
      }
    }
  }

  return (
    <ScrollArea className="max-h-[70vh]">
      <div className="space-y-6 p-1">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold" data-testid="text-detail-title">{detail.title}</h3>
            <Badge variant={TYPE_VARIANTS[detail.type] || "secondary"} className="text-xs">
              {TYPE_LABELS[detail.type] || detail.type}
            </Badge>
            {isClosed && (
              <Badge variant="outline" className="text-xs">
                Closed
              </Badge>
            )}
          </div>
          {detail.description && (
            <p className="text-sm text-muted-foreground mt-2" data-testid="text-detail-description">
              {detail.description}
            </p>
          )}
        </div>

        {detail.hasResponded && !isAdmin && (
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span data-testid="text-already-responded">You have already responded to this question.</span>
            </div>
          </Card>
        )}

        {canRespond && (
          <Card className="p-4 space-y-3">
            <h4 className="text-sm font-medium">Your Response</h4>
            {detail.type === "short_answer" ? (
              <Textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Type your answer..."
                data-testid="input-response-text"
              />
            ) : (
              <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
                {(detail.options || []).map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <RadioGroupItem
                      value={opt}
                      id={`opt-${questionId}-${idx}`}
                      data-testid={`radio-option-${idx}`}
                    />
                    <Label htmlFor={`opt-${questionId}-${idx}`}>{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}
            <Button
              size="sm"
              onClick={() => respondMutation.mutate()}
              disabled={!responseValue.trim() || respondMutation.isPending}
              data-testid="button-submit-response"
            >
              <Send className="w-4 h-4 mr-1" />
              {respondMutation.isPending ? "Submitting..." : "Submit Response"}
            </Button>
          </Card>
        )}

        {isAdmin && (
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">Response Analytics</h4>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="text-2xl font-bold" data-testid="text-total-responses">
                    {detail.responses.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Responses</div>
                </div>
                <div>
                  <div className="text-2xl font-bold" data-testid="text-total-members">
                    {detail.totalMembers}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Members</div>
                </div>
                <div>
                  <div className="text-2xl font-bold" data-testid="text-response-rate">
                    {Math.round(detail.responseRate)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Response Rate</div>
                </div>
              </div>
              <Progress value={detail.responseRate} className="h-2" />
            </Card>

            {(detail.type === "multiple_choice" || detail.type === "poll") &&
              detail.options &&
              detail.responses.length > 0 && (
                <Card className="p-4">
                  <h4 className="text-sm font-medium mb-3">Results Breakdown</h4>
                  <div className="space-y-3">
                    {detail.options.map((opt, idx) => {
                      const count = optionCounts[opt] || 0;
                      const pct =
                        detail.responses.length > 0
                          ? Math.round((count / detail.responses.length) * 100)
                          : 0;
                      return (
                        <div key={idx} data-testid={`result-option-${idx}`}>
                          <div className="flex items-center justify-between gap-2 text-sm mb-1">
                            <span>{opt}</span>
                            <span className="text-muted-foreground">
                              {count} ({pct}%)
                            </span>
                          </div>
                          <Progress value={pct} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

            {detail.type === "short_answer" && detail.responses.length > 0 && (
              <Card className="p-4">
                <h4 className="text-sm font-medium mb-3">Responses</h4>
                <div className="space-y-3">
                  {detail.responses.map((r) => (
                    <div
                      key={r.id}
                      className="border-b last:border-0 pb-2 last:pb-0"
                      data-testid={`response-item-${r.id}`}
                    >
                      <div className="text-xs text-muted-foreground mb-1">
                        {[r.user?.firstName, r.user?.lastName].filter(Boolean).join(" ") || "User"}
                      </div>
                      <div className="text-sm">{r.response}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {!isClosed && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => remindMutation.mutate()}
                    disabled={remindMutation.isPending}
                    data-testid="button-send-reminder"
                  >
                    <Bell className="w-4 h-4 mr-1" />
                    {remindMutation.isPending ? "Sending..." : "Send Reminder"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => closeMutation.mutate()}
                    disabled={closeMutation.isPending}
                    data-testid="button-close-question"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    {closeMutation.isPending ? "Closing..." : "Close Question"}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

export default function QuestionsPage({ workspaceId }: { workspaceId: string }) {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

  const { data: questions = [], isLoading: questionsLoading } = useQuery<Question[]>({
    queryKey: ["/api/workspaces", workspaceId, "questions"],
  });

  const { data: members = [] } = useQuery<WorkspaceMember[]>({
    queryKey: ["/api/workspaces", workspaceId, "members"],
  });

  const currentMember = members.find((m) => m.userId === user?.id);
  const isAdmin = currentMember?.role === "owner" || currentMember?.role === "admin";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 overflow-auto h-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-questions-title">
            Questions
          </h1>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowCreate(true)} data-testid="button-new-question">
            <Plus className="w-4 h-4 mr-1" />
            New Question
          </Button>
        )}
      </div>

      {questionsLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </Card>
          ))}
        </div>
      ) : questions.length === 0 ? (
        <Card className="p-8 text-center">
          <HelpCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-medium mb-1">No questions yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {isAdmin
              ? "Create your first question to gather feedback from your team."
              : "No questions have been posted in this workspace yet."}
          </p>
          {isAdmin && (
            <Button onClick={() => setShowCreate(true)} data-testid="button-create-first-question">
              <Plus className="w-4 h-4 mr-1" />
              Create Question
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => {
            const isClosed = q.status === "closed";
            const isOverdue = q.dueAt && new Date(q.dueAt) < new Date() && !isClosed;

            return (
              <Dialog
                key={q.id}
                open={selectedQuestionId === q.id}
                onOpenChange={(open) => setSelectedQuestionId(open ? q.id : null)}
              >
                <DialogTrigger asChild>
                  <Card
                    className="p-4 hover-elevate cursor-pointer"
                    data-testid={`card-question-${q.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-medium" data-testid={`text-question-title-${q.id}`}>
                            {q.title}
                          </h3>
                          <Badge
                            variant={TYPE_VARIANTS[q.type] || "secondary"}
                            className="text-xs"
                            data-testid={`badge-type-${q.id}`}
                          >
                            {TYPE_LABELS[q.type] || q.type}
                          </Badge>
                          {isClosed && (
                            <Badge variant="outline" className="text-xs">
                              Closed
                            </Badge>
                          )}
                          {isOverdue && (
                            <Badge variant="destructive" className="text-xs">
                              Overdue
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          {q.creator && (
                            <span data-testid={`text-creator-${q.id}`}>
                              {[q.creator.firstName, q.creator.lastName].filter(Boolean).join(" ") ||
                                "User"}
                            </span>
                          )}
                          {q.dueAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(q.dueAt).toLocaleDateString()}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {q.responseCount ?? 0} responses
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <HelpCircle className="w-5 h-5" />
                      Question Details
                    </DialogTitle>
                  </DialogHeader>
                  {selectedQuestionId === q.id && (
                    <QuestionDetailDialog questionId={q.id} isAdmin={isAdmin} />
                  )}
                </DialogContent>
              </Dialog>
            );
          })}
        </div>
      )}

      <CreateQuestionDialog
        workspaceId={workspaceId}
        open={showCreate}
        onOpenChange={setShowCreate}
      />
    </div>
  );
}
