import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface CreateBoardDialogProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (board: any) => void;
}

const COLORS = [
  "#3b82f6",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
];

export function CreateBoardDialog({
  workspaceId,
  open,
  onOpenChange,
  onCreated,
}: CreateBoardDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3b82f6");

  const mutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/workspaces/${workspaceId}/boards`, {
        name: name.trim(),
        description: description.trim() || null,
        coverColor: color,
      });
    },
    onSuccess: (board) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/workspaces", workspaceId, "boards"],
      });
      setName("");
      setDescription("");
      onOpenChange(false);
      onCreated?.(board);
      toast({ title: "Board created" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create board",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Board</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Name</label>
            <Input
              placeholder="My Board"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) mutation.mutate();
              }}
              autoFocus
              data-testid="input-board-name"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Description (optional)
            </label>
            <Textarea
              placeholder="What is this board for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              data-testid="textarea-board-description"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`w-7 h-7 rounded-md transition-transform ${color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : ""}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  data-testid={`button-board-color-${c}`}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
            data-testid="button-submit-board"
          >
            {mutation.isPending ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
