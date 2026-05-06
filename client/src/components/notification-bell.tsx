import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, Check, CheckCheck } from "lucide-react";
import type { Notification } from "@shared/schema";

interface NotificationBellProps {
  workspaceId: string | null;
}

export function NotificationBell({ workspaceId }: NotificationBellProps) {
  const [open, setOpen] = useState(false);

  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ["/api/notifications/unread-count", workspaceId],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/notifications/unread-count?workspaceId=${workspaceId}`,
      );
      return res.count;
    },
    enabled: !!workspaceId,
    refetchInterval: 5000,
  });

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", workspaceId],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/notifications?workspaceId=${workspaceId}`,
      );
      return res;
    },
    enabled: open && !!workspaceId,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/notifications", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/notifications/unread-count", workspaceId],
      });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/notifications/mark-all-read", {
        workspaceId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/notifications", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/notifications/unread-count", workspaceId],
      });
    },
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="button-notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span
              className="absolute top-1 right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center font-medium"
              data-testid="badge-notification-count"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
          <span className="text-sm font-semibold">Notifications</span>
          {notifications.some((n) => !n.read) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[320px]">
          {notifications.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No notifications yet
              </p>
            </div>
          ) : (
            <div>
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`px-4 py-3 border-b last:border-b-0 flex items-start gap-3 ${
                    !notif.read ? "bg-muted/30" : ""
                  }`}
                  data-testid={`notification-${notif.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{notif.message}</p>
                    <span className="text-xs text-muted-foreground">
                      {notif.createdAt
                        ? new Date(notif.createdAt).toLocaleString()
                        : ""}
                    </span>
                  </div>
                  {!notif.read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => markReadMutation.mutate(notif.id)}
                      data-testid={`button-mark-read-${notif.id}`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
