"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROUTES, isAuthenticatedClient } from "@/lib/auth";

// Automatically redirect if authentication completes in another tab (like clicking a magic link).
export function AuthSync() {
  const router = useRouter();

  useEffect(() => {
    function checkAuth() {
      if (document.visibilityState === "visible" && isAuthenticatedClient()) {
        router.push(ROUTES.app);
      }
    }

    // Check when user returns to this tab
    document.addEventListener("visibilitychange", checkAuth);
    
    // Also check periodically just in case they have them side-by-side
    const interval = setInterval(() => {
      if (isAuthenticatedClient()) {
        router.push(ROUTES.app);
      }
    }, 2000);

    return () => {
      document.removeEventListener("visibilitychange", checkAuth);
      clearInterval(interval);
    };
  }, [router]);

  return null;
}
