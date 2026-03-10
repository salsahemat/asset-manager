import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  MessageCircle,
  Plus,
  Send,
  Hash,
  SmilePlus,
  ThumbsUp,
  Heart,
  Laugh,
  Brain,
  Flame,
} from "lucide-react";
import type { User } from "@shared/models/auth";

interface ChatRoom {
  id: string;
  workspaceId: string;
  boardId?: string | null;
  name: string;
  description?: string | null;
  createdAt: string | null;
  createdBy?: string | null;
}

interface ChatReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string | null;
  user: User;
}

interface ChatMessage {
  id: string;
  roomId: string;
  workspaceId: string;
  userId: string;
  content: string;
  createdAt: string | null;
  user: User;
  reactions: ChatReaction[];
}

const REACTION_OPTIONS = [
  { emoji: "thumbs_up", Icon: ThumbsUp },
  { emoji: "heart", Icon: Heart },
  { emoji: "laugh", Icon: Laugh },
  { emoji: "thinking", Icon: Brain },
  { emoji: "fire", Icon: Flame },
] as const;

function getReactionIcon(emoji: string) {
  const match = REACTION_OPTIONS.find((r) => r.emoji === emoji);
  if (!match) return null;
  const IconComponent = match.Icon;
  return <IconComponent className="w-3 h-3" />;
}

function renderContent(content: string) {
  const parts = content.split(/(@\[([^\]]+)\]\([^)]+\))/g);
  const result: (string | JSX.Element)[] = [];
  let i = 0;
  while (i < parts.length) {
    const mentionMatch = parts[i]?.match(/^@\[([^\]]+)\]\(([^)]+)\)$/);
    if (mentionMatch) {
      result.push(
        <span
          key={i}
          className="bg-primary/15 text-primary font-medium px-1 rounded"
        >
          @{mentionMatch[1]}
        </span>,
      );
      i += 3;
    } else {
      if (parts[i]) result.push(parts[i]);
      i += 1;
    }
  }
  return result;
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return (
    d.toLocaleDateString([], { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
}

export default function ChatPage({ workspaceId }: { workspaceId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [openReactionMessageId, setOpenReactionMessageId] = useState<
    string | null
  >(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const autoCreatedRef = useRef(false);

  const { data: rooms = [], isLoading: roomsLoading } = useQuery<ChatRoom[]>({
    queryKey: ["/api/workspaces", workspaceId, "chat-rooms"],
  });

  const createRoomMutation = useMutation({
    mutationFn: async (body: { name: string; description?: string }) => {
      const res = await apiRequest(
        "POST",
        `/api/workspaces/${workspaceId}/chat-rooms`,
        body,
      );
      return res.json();
    },
    onSuccess: (room: ChatRoom) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/workspaces", workspaceId, "chat-rooms"],
      });
      setSelectedRoomId(room.id);
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to create room",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!roomsLoading && rooms.length === 0 && !autoCreatedRef.current) {
      autoCreatedRef.current = true;
      createRoomMutation.mutate({ name: "General" });
    }
  }, [roomsLoading, rooms.length]);

  useEffect(() => {
    if (rooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

  const { data: messages = [], isLoading: messagesLoading } = useQuery<
    ChatMessage[]
  >({
    queryKey: ["/api/chat-rooms", selectedRoomId, "messages?limit=50"],
    enabled: !!selectedRoomId,
    refetchInterval: 5000,
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (
      messages.length > 0 &&
      messages.length !== prevMessageCountRef.current
    ) {
      prevMessageCountRef.current = messages.length;
      setTimeout(scrollToBottom, 50);
    }
  }, [messages.length, scrollToBottom]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", `/api/chat-rooms/${selectedRoomId}/messages`, {
        content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/chat-rooms", selectedRoomId, "messages?limit=50"],
      });
      setMessageInput("");
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to send message",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const addReactionMutation = useMutation({
    mutationFn: async ({
      messageId,
      emoji,
    }: {
      messageId: string;
      emoji: string;
    }) => {
      await apiRequest("POST", `/api/chat-messages/${messageId}/reactions`, {
        emoji,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/chat-rooms", selectedRoomId, "messages?limit=50"],
      });
    },
  });

  const removeReactionMutation = useMutation({
    mutationFn: async ({
      messageId,
      emoji,
    }: {
      messageId: string;
      emoji: string;
    }) => {
      await apiRequest(
        "DELETE",
        `/api/chat-messages/${messageId}/reactions/${emoji}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/chat-rooms", selectedRoomId, "messages?limit=50"],
      });
    },
  });

  function handleSend() {
    const trimmed = messageInput.trim();
    if (!trimmed || !selectedRoomId) return;
    sendMessageMutation.mutate(trimmed);
  }

  function handleReaction(messageId: string, emoji: string) {
    if (!user) return;
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;
    const existing = msg.reactions.find(
      (r) => r.userId === user.id && r.emoji === emoji,
    );
    if (existing) {
      removeReactionMutation.mutate({ messageId, emoji });
    } else {
      addReactionMutation.mutate({ messageId, emoji });
    }
    setOpenReactionMessageId(null);
  }

  function handleCreateRoom() {
    const trimmed = newRoomName.trim();
    if (!trimmed) return;
    createRoomMutation.mutate({
      name: trimmed,
      description: newRoomDescription.trim() || undefined,
    });
    setNewRoomName("");
    setNewRoomDescription("");
    setShowCreateRoom(false);
  }

  function groupReactions(reactions: ChatReaction[]) {
    const grouped: Record<
      string,
      { count: number; users: string[]; userIds: string[] }
    > = {};
    for (const r of reactions) {
      if (!grouped[r.emoji]) {
        grouped[r.emoji] = { count: 0, users: [], userIds: [] };
      }
      grouped[r.emoji].count++;
      grouped[r.emoji].users.push(
        [r.user?.firstName, r.user?.lastName].filter(Boolean).join(" ") ||
          "User",
      );
      grouped[r.emoji].userIds.push(r.userId);
    }
    return grouped;
  }

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  return (
    <div className="flex h-full" data-testid="chat-page">
      <div className="w-60 shrink-0 border-r flex flex-col">
        <div className="p-3 border-b flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold truncate">Channels</h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowCreateRoom(true)}
            data-testid="button-create-room"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {roomsLoading ? (
              <div className="p-3 text-sm text-muted-foreground">
                Loading...
              </div>
            ) : rooms.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">
                No channels yet
              </div>
            ) : (
              rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors hover-elevate ${
                    selectedRoomId === room.id
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground"
                  }`}
                  data-testid={`button-room-${room.id}`}
                >
                  <Hash className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{room.name}</span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {selectedRoom ? (
          <>
            <div className="p-3 border-b flex items-center gap-2 shrink-0 h-12">
              <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
              <h2
                className="font-semibold text-sm truncate"
                data-testid="text-room-name"
              >
                {selectedRoom.name}
              </h2>
              {selectedRoom.description && (
                <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                  {selectedRoom.description}
                </span>
              )}
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-1">
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div
                    className="flex flex-col items-center justify-center py-12 text-center"
                    data-testid="empty-messages"
                  >
                    <MessageCircle className="w-10 h-10 text-muted-foreground mb-3" />
                    <h3 className="font-medium mb-1">No messages yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Be the first to send a message in #{selectedRoom.name}
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMine = msg.userId === user?.id;
                    const prevMsg = idx > 0 ? messages[idx - 1] : null;
                    const showSeparator =
                      prevMsg &&
                      msg.createdAt &&
                      prevMsg.createdAt &&
                      new Date(msg.createdAt).toDateString() !==
                        new Date(prevMsg.createdAt).toDateString();
                    const grouped = groupReactions(msg.reactions || []);

                    return (
                      <div key={msg.id}>
                        {showSeparator && (
                          <div className="flex items-center gap-3 my-4">
                            <Separator className="flex-1" />
                            <span className="text-xs text-muted-foreground shrink-0">
                              {new Date(msg.createdAt!).toLocaleDateString([], {
                                weekday: "long",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            <Separator className="flex-1" />
                          </div>
                        )}
                        <div
                          className={`flex w-full mb-3 ${
                            isMine ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`flex gap-2 max-w-[70%] ${isMine ? "flex-row-reverse" : ""}`}
                          >
                            {!isMine && (
                              <Avatar className="w-8 h-8">
                                <AvatarImage
                                  src={msg.user?.profileImageUrl || undefined}
                                />
                                <AvatarFallback>
                                  {msg.user?.firstName?.[0] || "U"}
                                </AvatarFallback>
                              </Avatar>
                            )}

                            <div
                              className={`px-3 py-2 rounded-xl text-sm shadow-sm ${
                                isMine
                                  ? "bg-amber-200 text-black"
                                  : "bg-white border"
                              }`}
                            >
                              {!isMine && (
                                <div className="text-xs font-semibold mb-1">
                                  {[msg.user?.firstName, msg.user?.lastName]
                                    .filter(Boolean)
                                    .join(" ") || "User"}
                                </div>
                              )}

                              <div className="break-words">
                                {renderContent(msg.content)}
                              </div>

                              <div className="text-[10px] text-muted-foreground text-right mt-1">
                                {formatTime(msg.createdAt)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-3 border-t shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={`Message #${selectedRoom.name}`}
                  disabled={sendMessageMutation.isPending}
                  data-testid="input-message"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={
                    !messageInput.trim() || sendMessageMutation.isPending
                  }
                  data-testid="button-send-message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium mb-1">Select a channel</h3>
              <p className="text-sm text-muted-foreground">
                Choose a channel to start chatting
              </p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showCreateRoom} onOpenChange={setShowCreateRoom}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Channel</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="Channel name"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              data-testid="input-room-name"
            />
            <Input
              placeholder="Description (optional)"
              value={newRoomDescription}
              onChange={(e) => setNewRoomDescription(e.target.value)}
              data-testid="input-room-description"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateRoom(false)}
              data-testid="button-cancel-create-room"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRoom}
              disabled={!newRoomName.trim() || createRoomMutation.isPending}
              data-testid="button-confirm-create-room"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
