import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useSession } from "@/features/auth/use-session";
import type { Role } from "@/features/auth/auth.api";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowed?: Role[];
}

export default function ProtectedRoute({ children, allowed }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useSession();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowed && user && !allowed.includes(user.role)) {
    return <Navigate to={user.role === "EMPLOYEE" ? "/portal" : "/"} replace />;
  }

  return <>{children}</>;
}
