import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Orbit, Check, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

export default function InvitePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );

  useEffect(() => {
    if (!user) return;

    const params = new URLSearchParams(window.location.search);
    const workspaceId = params.get("workspaceId");

    if (!workspaceId) {
      setStatus("error");
      return;
    }

    apiRequest("POST", `/api/workspaces/${workspaceId}/join`)
      .then(() => {
        localStorage.setItem("activeWorkspaceId", workspaceId);
        setStatus("success");
        setTimeout(() => setLocation("/"), 1500);
      })
      .catch(() => {
        setStatus("error");
      });
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="p-8 text-center max-w-md w-full">
          <Orbit className="w-10 h-10 mx-auto text-primary mb-4" />
          <h2 className="text-lg font-semibold mb-2">Workspace Invite</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Please sign in to accept this invitation.
          </p>
          <Button asChild>
            <a href="/api/login">Sign In</a>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="p-8 text-center max-w-md w-full">
        {status === "loading" && (
          <>
            <Orbit className="w-10 h-10 mx-auto text-primary mb-4 animate-spin" />
            <h2 className="text-lg font-semibold">Joining workspace...</h2>
          </>
        )}

        {status === "success" && (
          <>
            <Check className="w-10 h-10 mx-auto text-green-600 mb-4" />
            <h2 className="text-lg font-semibold">You're in!</h2>
          </>
        )}

        {status === "error" && (
          <>
            <X className="w-10 h-10 mx-auto text-red-600 mb-4" />
            <h2 className="text-lg font-semibold">Something went wrong</h2>
          </>
        )}
      </Card>
    </div>
  );
}
