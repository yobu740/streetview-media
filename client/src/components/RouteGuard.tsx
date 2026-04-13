import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useEffect } from "react";
import { useLocation } from "wouter";

interface RouteGuardProps {
  children: React.ReactNode;
  /** If true, only admin role can access. Vendedores and regular users are redirected. */
  adminOnly?: boolean;
  /** If true, only admin or vendedor can access. Regular users are redirected. */
  staffOnly?: boolean;
}

/**
 * Wraps a route to enforce role-based access control.
 * - Unauthenticated users → login page
 * - adminOnly: only role==="admin" can access, others → /vendedor
 * - staffOnly: role==="admin" or role==="vendedor" can access, others → /
 */
export default function RouteGuard({ children, adminOnly = false, staffOnly = false }: RouteGuardProps) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      window.location.href = getLoginUrl();
      return;
    }

    if (adminOnly && user.role !== "admin") {
      navigate("/vendedor");
      return;
    }

    if (staffOnly && user.role !== "admin" && user.role !== "vendedor") {
      navigate("/");
      return;
    }
  }, [loading, user, adminOnly, staffOnly, navigate]);

  if (loading) return null;
  if (!user) return null;
  if (adminOnly && user.role !== "admin") return null;
  if (staffOnly && user.role !== "admin" && user.role !== "vendedor") return null;

  return <>{children}</>;
}
