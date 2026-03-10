import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { CreateWorkspaceDialog } from "@/components/create-workspace-dialog";
import { CreateBoardDialog } from "@/components/create-board-dialog";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus, Search, Orbit } from "lucide-react";
import LandingPage from "@/pages/landing";
import HomePage from "@/pages/home";
import BoardPage from "@/pages/board";
import SettingsPage from "@/pages/settings";
import ChatPage from "@/pages/chat";
import QuestionsPage from "@/pages/questions";
import NotFound from "@/pages/not-found";
import InvitePage from "@/pages/invite";
import { NotificationBell } from "@/components/notification-bell";
import { CommandPalette } from "@/components/command-palette";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import type { Workspace, Board } from "@shared/schema";

function AuthenticatedApp() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    () => {
      return localStorage.getItem("activeWorkspaceId");
    },
  );
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showCreateBoard, setShowCreateBoard] = useState(false);

  const { data: workspaces = [], isLoading: wsLoading } = useQuery<Workspace[]>(
    {
      queryKey: ["/api/workspaces"],
    },
  );

  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || null;

  useEffect(() => {
    if (activeWorkspace && activeWorkspace.id !== activeWorkspaceId) {
      setActiveWorkspaceId(activeWorkspace.id);
      localStorage.setItem("activeWorkspaceId", activeWorkspace.id);
    }
  }, [activeWorkspace, activeWorkspaceId]);

  useEffect(() => {
    if (!wsLoading && workspaces.length === 0) {
      setShowCreateWorkspace(true);
    }
  }, [wsLoading, workspaces]);

  const { data: boards = [] } = useQuery<Board[]>({
    queryKey: ["/api/workspaces", activeWorkspace?.id, "boards"],
    enabled: !!activeWorkspace?.id,
  });

  const { data: roleData } = useQuery<{ role: string }>({
    queryKey: ["/api/workspaces", activeWorkspace?.id, "my-role"],
    enabled: !!activeWorkspace?.id,
  });
  const userRole = roleData?.role || "member";

  if (wsLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="space-y-3 text-center">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center mx-auto">
            <Orbit className="w-6 h-6 text-primary-foreground animate-pulse" />
          </div>
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar
          user={user}
          workspace={activeWorkspace}
          workspaces={workspaces}
          boards={boards}
          onCreateBoard={() => setShowCreateBoard(true)}
          onSwitchWorkspace={(ws) => {
            setActiveWorkspaceId(ws.id);
            localStorage.setItem("activeWorkspaceId", ws.id);
            setLocation("/");
          }}
          onCreateWorkspace={() => setShowCreateWorkspace(true)}
        />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 p-2 border-b shrink-0 h-12">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateBoard(true)}
                data-testid="button-header-create"
              >
                <Plus className="w-4 h-4 mr-1" />
                New
              </Button>
              <NotificationBell workspaceId={activeWorkspace?.id || null} />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-hidden">
            <Switch>
              <Route path="/">
                {activeWorkspace ? (
                  <HomePage
                    user={user}
                    workspaceId={activeWorkspace.id}
                    onCreateBoard={() => setShowCreateBoard(true)}
                  />
                ) : null}
              </Route>
              <Route path="/board/:boardId">
                {(params) =>
                  activeWorkspace ? (
                    <BoardPage
                      boardId={params.boardId}
                      workspaceId={activeWorkspace.id}
                      userRole={userRole}
                    />
                  ) : null
                }
              </Route>
              <Route path="/chat">
                {activeWorkspace ? (
                  <ChatPage workspaceId={activeWorkspace.id} />
                ) : null}
              </Route>
              <Route path="/questions">
                {activeWorkspace ? (
                  <QuestionsPage workspaceId={activeWorkspace.id} />
                ) : null}
              </Route>
              <Route path="/settings">
                {activeWorkspace ? (
                  <SettingsPage workspace={activeWorkspace} />
                ) : null}
              </Route>
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>

      <CreateWorkspaceDialog
        open={showCreateWorkspace}
        onOpenChange={setShowCreateWorkspace}
        onCreated={(ws) => {
          setActiveWorkspaceId(ws.id);
          localStorage.setItem("activeWorkspaceId", ws.id);
        }}
      />

      {activeWorkspace && (
        <CreateBoardDialog
          workspaceId={activeWorkspace.id}
          open={showCreateBoard}
          onOpenChange={setShowCreateBoard}
          onCreated={(board) => {
            setLocation(`/board/${board.id}`);
          }}
        />
      )}

      <CommandPalette
        workspaceId={activeWorkspace?.id || null}
        boards={boards}
      />
    </SidebarProvider>
  );
}

function Router() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (location.startsWith("/invite")) {
    return <InvitePage />;
  }
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="space-y-3 text-center">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center mx-auto">
            <Orbit className="w-6 h-6 text-primary-foreground animate-pulse" />
          </div>
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (location === "/login") {
    return <LoginPage />;
  }

  if (location === "/register") {
    return <RegisterPage />;
  }
  if (!user) {
    return <LandingPage />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
