import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  LayoutDashboard,
  ArrowUp,
  ArrowDown,
  Minus,
  Flag,
  Settings,
  Home,
} from "lucide-react";

interface CommandPaletteProps {
  workspaceId: string | null;
  boards: any[];
}

const PRIORITY_CONFIG: Record<string, { icon: typeof ArrowUp; color: string }> = {
  urgent: { icon: Flag, color: "text-red-500" },
  high: { icon: ArrowUp, color: "text-orange-500" },
  medium: { icon: Minus, color: "text-yellow-500" },
  low: { icon: ArrowDown, color: "text-blue-500" },
};

export function CommandPalette({ workspaceId, boards }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();

  const { data: searchResults = [] } = useQuery<any[]>({
    queryKey: ["/api/workspaces", workspaceId, "search", query],
    queryFn: async () => {
      if (!workspaceId || !query.trim()) return [];
      const res = await fetch(`/api/workspaces/${workspaceId}/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!workspaceId && query.trim().length >= 2,
  });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setOpen(true);
    }
    if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
      e.preventDefault();
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const navigate = (path: string) => {
    setLocation(path);
    setOpen(false);
    setQuery("");
  };

  const navItems = [
    { label: "Dashboard", path: "/", icon: Home },
    { label: "Settings", path: "/settings", icon: Settings },
    ...boards.map((b) => ({
      label: b.name,
      path: `/board/${b.id}`,
      icon: LayoutDashboard,
    })),
  ];

  const filteredNav = query.trim()
    ? navItems.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
    : navItems;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 gap-0 max-w-lg" data-testid="command-palette">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="flex items-center gap-2 px-4 border-b">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Search tasks, boards..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 shadow-none focus-visible:ring-0 text-sm"
            autoFocus
            data-testid="input-command-search"
          />
          <kbd className="pointer-events-none text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono shrink-0">
            ESC
          </kbd>
        </div>
        <ScrollArea className="max-h-[360px]">
          <div className="p-2">
            {filteredNav.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 py-1">
                  Pages
                </p>
                {filteredNav.map((item) => (
                  <button
                    key={item.path}
                    className="flex items-center gap-2 w-full px-2 py-2 rounded-md text-sm hover-elevate text-left"
                    onClick={() => navigate(item.path)}
                    data-testid={`command-nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                  >
                    <item.icon className="w-4 h-4 text-muted-foreground" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}

            {searchResults.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 py-1">
                  Tasks
                </p>
                {searchResults.map((task: any) => {
                  const pConf = PRIORITY_CONFIG[task.priority || "medium"];
                  const PIcon = pConf?.icon || Minus;
                  return (
                    <button
                      key={task.id}
                      className="flex items-center gap-2 w-full px-2 py-2 rounded-md text-sm hover-elevate text-left"
                      onClick={() => navigate(`/board/${task.boardId}`)}
                      data-testid={`command-task-${task.id}`}
                    >
                      <PIcon className={`w-3.5 h-3.5 ${pConf?.color || ""} shrink-0`} />
                      <span className="truncate flex-1">{task.title}</span>
                      {task.boardName && (
                        <Badge variant="secondary" className="text-[9px] shrink-0">{task.boardName}</Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {query.trim().length >= 2 && searchResults.length === 0 && filteredNav.length === 0 && (
              <div className="py-8 text-center">
                <Search className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No results found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
