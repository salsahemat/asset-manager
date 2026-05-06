import { useLocation, Link } from "wouter";
import { queryClient } from "@/lib/queryClient";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Plus,
  Settings,
  LogOut,
  ChevronsUpDown,
  Orbit,
  Home,
  MessageCircle,
  HelpCircle,
  ClipboardList,
} from "lucide-react";
import type { User } from "@shared/models/auth";
import type { Workspace, Board } from "@shared/schema";

interface AppSidebarProps {
  user: User;
  workspace: Workspace | null;
  workspaces: Workspace[];
  boards: Board[];
  onCreateBoard: () => void;
  onSwitchWorkspace: (ws: Workspace) => void;
  onCreateWorkspace: () => void;
}

export function AppSidebar({
  user,
  workspace,
  workspaces,
  boards,
  onCreateBoard,
  onSwitchWorkspace,
  onCreateWorkspace,
}: AppSidebarProps) {
  const [location] = useLocation();

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  data-testid="button-workspace-switcher"
                >
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{
                      backgroundColor: workspace?.iconColor || "#3b82f6",
                    }}
                  >
                    {workspace?.name?.[0]?.toUpperCase() || "W"}
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none min-w-0">
                    <span className="font-semibold text-sm truncate">
                      {workspace?.name || "Workspace"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Free plan
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto w-4 h-4 text-muted-foreground shrink-0" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {workspaces.map((ws) => (
                  <DropdownMenuItem
                    key={ws.id}
                    onClick={() => onSwitchWorkspace(ws)}
                    data-testid={`menu-workspace-${ws.id}`}
                  >
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold mr-2 shrink-0"
                      style={{ backgroundColor: ws.iconColor || "#3b82f6" }}
                    >
                      {ws.name[0]?.toUpperCase()}
                    </div>
                    <span className="truncate">{ws.name}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onCreateWorkspace}
                  data-testid="button-create-workspace"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create workspace
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/"}>
                  <Link
                    href="/"
                    data-testid="link-home"
                    onClick={() => {
                      if (!workspace?.id) return;
                      queryClient.invalidateQueries({
                        queryKey: ["/api/workspaces", workspace.id, "boards"],
                      });
                      queryClient.invalidateQueries({
                        queryKey: [
                          "/api/workspaces",
                          workspace.id,
                          "detailed-stats",
                        ],
                      });
                    }}
                  >
                    <Home className="w-4 h-4" />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Boards</SidebarGroupLabel>
          <SidebarGroupAction
            onClick={onCreateBoard}
            data-testid="button-add-board"
          >
            <Plus className="w-4 h-4" />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {boards.map((board) => (
                <SidebarMenuItem key={board.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === `/board/${board.id}`}
                  >
                    <Link
                      href={`/board/${board.id}`}
                      data-testid={`link-board-${board.id}`}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>{board.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {boards.length === 0 && (
                <div className="px-2 py-4 text-center">
                  <p className="text-xs text-muted-foreground">No boards yet</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 text-xs"
                    onClick={onCreateBoard}
                    data-testid="button-create-first-board"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Create board
                  </Button>
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/chat"}>
                  <Link href="/chat" data-testid="link-chat">
                    <MessageCircle className="w-4 h-4" />
                    <span>Chat</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/questions"}>
                  <Link href="/questions" data-testid="link-questions">
                    <HelpCircle className="w-4 h-4" />
                    <span>Questions</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {/* ← TAMBAH INI */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/attendance"}
                >
                  <Link href="/attendance" data-testid="link-attendance">
                    <ClipboardList className="w-4 h-4" />
                    <span>Attendance</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/settings"}>
                  <Link href="/settings" data-testid="link-settings">
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" data-testid="button-user-menu">
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={user.profileImageUrl || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(user.firstName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 leading-none min-w-0">
                    <span className="text-sm font-medium truncate">
                      {[user.firstName, user.lastName]
                        .filter(Boolean)
                        .join(" ") || "User"}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <a href="/api/logout" data-testid="button-logout">
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
