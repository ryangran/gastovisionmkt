import { ReactNode } from "react";
import { AccessDenied } from "@/components/AccessDenied";
import { usePagePermission } from "@/hooks/usePagePermission";

interface ProtectedRouteProps {
  pagePath: string;
  children: ReactNode;
}

export const ProtectedRoute = ({ pagePath, children }: ProtectedRouteProps) => {
  const { hasPermission, isLoading, userEmail } = usePagePermission(pagePath);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!hasPermission) {
    return <AccessDenied userEmail={userEmail} />;
  }

  return <>{children}</>;
};
