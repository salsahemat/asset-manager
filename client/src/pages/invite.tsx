import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";
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
      <div className="flex items-center justify-center min-h-screen bg-white p-4">
        <div className="flex flex-col items-center w-full max-w-sm text-center">
          {/* Workspace avatar */}
          <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-2xl mb-6">
            🗂️
          </div>

          <h1 className="text-[17px] font-semibold text-[#37352f] mb-2 leading-snug">
            You've been invited to a workspace
          </h1>
          <p className="text-sm text-[#9b9a97] mb-6">
            Please sign in to accept this invitation.
          </p>

          <Button
            asChild
            className="w-full bg-[#2383e2] hover:bg-[#1a6dbf] text-white rounded font-medium text-sm h-9"
          >
            <a href="/api/login">Sign In</a>
          </Button>

          {/* Divider */}
          <div className="w-full h-px bg-[#e9e9e7] my-8" />

          {/* Workspace row */}
          <div className="w-full flex items-center gap-3 text-left">
            <div className="w-9 h-9 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center text-base shrink-0">
              🚀
            </div>
            <div>
              <div className="text-sm font-medium text-[#37352f]">
                Workspace
              </div>
              <div className="text-xs text-[#9b9a97]">3 members</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-white p-4">
      <div className="flex flex-col items-center w-full max-w-sm text-center">
        {/* Status icon */}
        <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center mb-6">
          {status === "loading" && (
            <Loader2 className="w-7 h-7 text-[#9b9a97] animate-spin" />
          )}
          {status === "success" && <Check className="w-7 h-7 text-green-600" />}
          {status === "error" && <X className="w-7 h-7 text-red-500" />}
        </div>

        {status === "loading" && (
          <>
            <h1 className="text-[17px] font-semibold text-[#37352f] mb-2">
              Joining workspace...
            </h1>
            <p className="text-sm text-[#9b9a97]">
              Please wait while we add you.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <h1 className="text-[17px] font-semibold text-[#37352f] mb-2">
              You're in!
            </h1>
            <p className="text-sm text-[#9b9a97]">
              Redirecting you to the workspace...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-[17px] font-semibold text-[#37352f] mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-[#9b9a97] mb-6">
              This invite may be invalid or expired.
            </p>
            <Button
              onClick={() => setLocation("/")}
              className="w-full bg-[#2383e2] hover:bg-[#1a6dbf] text-white rounded font-medium text-sm h-9"
            >
              Go Home
            </Button>
          </>
        )}

        {/* Divider */}
        <div className="w-full h-px bg-[#e9e9e7] my-8" />

        {/* Workspace row */}
        <div className="w-full flex items-center gap-3 text-left">
          <div className="w-9 h-9 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center text-base shrink-0">
            🚀
          </div>
          <div>
            <div className="text-sm font-medium text-[#37352f]">Workspace</div>
            <div className="text-xs text-[#9b9a97]">3 members</div>
          </div>
        </div>
      </div>
    </div>
  );
}
