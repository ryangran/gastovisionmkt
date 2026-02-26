import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UsePagePermissionResult {
  hasPermission: boolean | null;
  isLoading: boolean;
  isAdmin: boolean;
  userEmail: string | null;
}

export const usePagePermission = (pagePath: string): UsePagePermissionResult => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkPermissionForSession = async (sessionUser: { id: string; email?: string | null } | null) => {
      if (!isMounted) return;

      try {
        if (!sessionUser) {
          setUserEmail(null);
          setIsAdmin(false);
          setHasPermission(false);
          return;
        }

        setUserEmail(sessionUser.email || null);

        // Admins have access to everything
        const { data: adminData, error: adminError } = await supabase.rpc("has_role", {
          _user_id: sessionUser.id,
          _role: "admin",
        });

        if (adminError) {
          console.error("[usePagePermission] Admin check error:", adminError);
        }

        if (adminData === true) {
          setIsAdmin(true);
          setHasPermission(true);
          return;
        }

        setIsAdmin(false);

        // Specific page permission
        const { data: permissionData, error } = await supabase
          .from("user_page_permissions")
          .select("id")
          .eq("user_email", sessionUser.email)
          .eq("page_path", pagePath)
          .maybeSingle();

        if (error) {
          console.error("[usePagePermission] Permission check error:", error);
          setHasPermission(false);
          return;
        }

        setHasPermission(!!permissionData);
      } catch (error) {
        console.error("[usePagePermission] Error in permission check:", error);
        setHasPermission(false);
      }
    };

    // Initial check
    setIsLoading(true);
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => checkPermissionForSession(session?.user ?? null))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    // Re-check on auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Avoid calling Supabase inside the callback directly
      setTimeout(() => {
        if (!isMounted) return;
        setIsLoading(true);
        checkPermissionForSession(session?.user ?? null).finally(() => {
          if (isMounted) setIsLoading(false);
        });
      }, 0);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [pagePath]);

  return { hasPermission, isLoading, isAdmin, userEmail };
};
