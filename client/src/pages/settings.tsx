import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Tag,
  Plus,
  Trash2,
  Mail,
  Copy,
  Link2,
  UserMinus,
  Shield,
  ShieldCheck,
} from "lucide-react";
import type {
  Workspace,
  WorkspaceMember,
  Label,
  WorkspaceInvite,
} from "@shared/schema";
import type { User } from "@shared/models/auth";

interface SettingsPageProps {
  workspace: Workspace;
}

export default function SettingsPage({ workspace }: SettingsPageProps) {
  const { toast } = useToast();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#3b82f6");

  const { data: roleData } = useQuery<{ role: string }>({
    queryKey: ["/api/workspaces", workspace.id, "my-role"],
  });
  const currentUserRole = roleData?.role || "member";
  const isOwnerOrAdmin = ["owner", "admin"].includes(currentUserRole);

  const { data: members = [] } = useQuery<(WorkspaceMember & { user: User })[]>(
    {
      queryKey: ["/api/workspaces", workspace.id, "members"],
    },
  );

  const { data: labels = [] } = useQuery<Label[]>({
    queryKey: ["/api/workspaces", workspace.id, "labels"],
  });

  const { data: invites = [] } = useQuery<WorkspaceInvite[]>({
    queryKey: ["/api/workspaces", workspace.id, "invites"],
  });

  const createLabelMutation = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      await apiRequest("POST", `/api/workspaces/${workspace.id}/labels`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/workspaces", workspace.id, "labels"],
      });
      setNewLabelName("");
      toast({ title: "Label created" });
    },
  });

  const deleteLabelMutation = useMutation({
    mutationFn: async (labelId: string) => {
      await apiRequest("DELETE", `/api/labels/${labelId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/workspaces", workspace.id, "labels"],
      });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      return await apiRequest(
        "POST",
        `/api/workspaces/${workspace.id}/invites`,
        data,
      );
    },
    onSuccess: (invite: any) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/workspaces", workspace.id, "invites"],
      });
      setInviteEmail("");
      const inviteUrl = `${window.location.origin}/invite/${invite.token}`;
      navigator.clipboard.writeText(inviteUrl).catch(() => {});
      toast({
        title: "Invite created",
        description: "Invite link copied to clipboard.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send invite",
        variant: "destructive",
      });
    },
  });

  const deleteInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      await apiRequest("DELETE", `/api/invites/${inviteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/workspaces", workspace.id, "invites"],
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest(
        "PATCH",
        `/api/workspaces/${workspace.id}/members/${userId}/role`,
        { role },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/workspaces", workspace.id, "members"],
      });
      toast({ title: "Role updated" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest(
        "DELETE",
        `/api/workspaces/${workspace.id}/members/${userId}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/workspaces", workspace.id, "members"],
      });
      toast({ title: "Member removed" });
    },
  });

  const LABEL_COLORS = [
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#6b7280",
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8 overflow-auto h-full">
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          data-testid="text-settings-title"
        >
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your workspace settings, members, and labels.
        </p>
      </div>

      <Card className="p-6">
        <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
          <Users className="w-4 h-4" />
          Members
        </h2>
        <div className="space-y-3 mb-6">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3"
              data-testid={`member-${member.id}`}
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={member.user?.profileImageUrl || undefined} />
                <AvatarFallback className="text-xs">
                  {member.user?.firstName?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {[member.user?.firstName, member.user?.lastName]
                    .filter(Boolean)
                    .join(" ") || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {member.user?.email}
                </p>
              </div>
              {member.role === "owner" ? (
                <Badge
                  variant="default"
                  className="text-[10px]"
                  data-testid={`badge-role-${member.id}`}
                >
                  Owner
                </Badge>
              ) : isOwnerOrAdmin ? (
                <div className="flex items-center gap-1">
                  <Select
                    value={member.role}
                    onValueChange={(role) =>
                      updateRoleMutation.mutate({ userId: member.userId, role })
                    }
                  >
                    <SelectTrigger
                      className="h-7 w-24 text-xs"
                      data-testid={`select-role-${member.id}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMemberMutation.mutate(member.userId)}
                    data-testid={`button-remove-member-${member.id}`}
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <Badge
                  variant="secondary"
                  className="text-[10px] capitalize"
                  data-testid={`badge-role-${member.id}`}
                >
                  {member.role}
                </Badge>
              )}
            </div>
          ))}
        </div>

        {isOwnerOrAdmin && (
          <>
            <Separator className="mb-4" />

            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5" />
              Invite Members
            </h3>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Input
                type="email"
                placeholder="Email address..."
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 min-w-[200px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && inviteEmail.trim()) {
                    inviteMutation.mutate({
                      email: inviteEmail.trim(),
                      role: inviteRole,
                    });
                  }
                }}
                data-testid="input-invite-email"
              />
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger
                  className="w-24"
                  data-testid="select-invite-role"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={!inviteEmail.trim() || inviteMutation.isPending}
                onClick={() => {
                  if (inviteEmail.trim()) {
                    inviteMutation.mutate({
                      email: inviteEmail.trim(),
                      role: inviteRole,
                    });
                  }
                }}
                data-testid="button-send-invite"
              >
                <Plus className="w-4 h-4 mr-1" />
                Invite
              </Button>
            </div>

            {invites.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Pending Invites
                </h4>
                {invites
                  .filter((inv) => inv.status === "pending")
                  .map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center gap-3 group"
                      data-testid={`invite-${invite.id}`}
                    >
                      <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm flex-1 truncate">
                        {invite.email}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] capitalize"
                      >
                        {invite.role}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const url = `${window.location.origin}/invite/${invite.token}`;
                          navigator.clipboard.writeText(url).catch(() => {});
                          toast({ title: "Link copied" });
                        }}
                        data-testid={`button-copy-invite-${invite.id}`}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="invisible group-hover:visible"
                        onClick={() => deleteInviteMutation.mutate(invite.id)}
                        data-testid={`button-delete-invite-${invite.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </Card>

      <Card className="p-6" data-testid="card-permissions">
        <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4" />
          Roles & Permissions
        </h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">Owner / Admin</p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 list-disc list-inside">
                <li>Create, edit, and delete any task</li>
                <li>Move any task between columns</li>
                <li>Invite and remove members</li>
                <li>Change member roles</li>
                <li>Manage workspace settings and labels</li>
              </ul>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Users className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">Member</p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 list-disc list-inside">
                <li>Create new tasks</li>
                <li>Edit and move tasks they created or are assigned to</li>
                <li>Comment on any task</li>
                <li>View all boards, tasks, and members</li>
                <li>Cannot delete tasks or manage members</li>
              </ul>
            </div>
          </div>
          <div className="mt-2 p-3 rounded-md bg-muted/50">
            <p className="text-xs text-muted-foreground">
              Your current role:{" "}
              <Badge
                variant={isOwnerOrAdmin ? "default" : "secondary"}
                className="text-[10px] ml-1 capitalize"
                data-testid="badge-my-role"
              >
                {currentUserRole}
              </Badge>
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
          <Tag className="w-4 h-4" />
          Labels
        </h2>
        <div className="space-y-2 mb-4">
          {labels.map((label) => (
            <div
              key={label.id}
              className="flex items-center gap-3 group"
              data-testid={`label-${label.id}`}
            >
              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: label.color }}
              />
              <span className="text-sm flex-1">{label.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="invisible group-hover:visible"
                onClick={() => deleteLabelMutation.mutate(label.id)}
                data-testid={`button-delete-label-${label.id}`}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          {labels.length === 0 && (
            <p className="text-sm text-muted-foreground">No labels yet.</p>
          )}
        </div>

        <Separator className="mb-4" />

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            {LABEL_COLORS.map((color) => (
              <button
                key={color}
                className={`w-5 h-5 rounded-full transition-transform ${newLabelColor === color ? "ring-2 ring-offset-2 ring-primary scale-110" : ""}`}
                style={{ backgroundColor: color }}
                onClick={() => setNewLabelColor(color)}
                data-testid={`button-color-${color}`}
              />
            ))}
          </div>
          <Input
            placeholder="Label name..."
            value={newLabelName}
            onChange={(e) => setNewLabelName(e.target.value)}
            className="flex-1 min-w-[120px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newLabelName.trim()) {
                createLabelMutation.mutate({
                  name: newLabelName.trim(),
                  color: newLabelColor,
                });
              }
            }}
            data-testid="input-label-name"
          />
          <Button
            size="sm"
            disabled={!newLabelName.trim() || createLabelMutation.isPending}
            onClick={() => {
              if (newLabelName.trim()) {
                createLabelMutation.mutate({
                  name: newLabelName.trim(),
                  color: newLabelColor,
                });
              }
            }}
            data-testid="button-create-label"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </Card>
    </div>
  );
}
