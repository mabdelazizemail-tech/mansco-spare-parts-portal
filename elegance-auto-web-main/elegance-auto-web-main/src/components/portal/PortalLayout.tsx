import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { PortalSidebar, PortalTopbar } from "./PortalChrome";

export const PortalLayout = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return (
    <div className="min-h-screen flex bg-background">
      <PortalSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <PortalTopbar />
        <main className="flex-1 overflow-y-auto">
          <div className="container-portal py-6 md:py-8 fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
