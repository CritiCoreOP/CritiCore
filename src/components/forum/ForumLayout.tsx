import { memo } from "react";
import { Outlet } from "react-router-dom";
import { useNavigate } from "@/lib/locale-router";
import ForumNavbar from "./ForumNavbar";
import ForumSidebar from "./ForumSidebar";
import ForumRightPanel from "./ForumRightPanel";
import ForumWelcomeDialog from "./ForumWelcomeDialog";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Plus } from "lucide-react";

const MemoizedNavbar = memo(ForumNavbar);
const MemoizedSidebar = memo(ForumSidebar);
const MemoizedRightPanel = memo(ForumRightPanel);

const ForumLayout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <MemoizedNavbar />
      <div className="flex flex-1 pt-14 max-w-[1440px] mx-auto w-full">
        <MemoizedSidebar />

        {/* Mobile sidebar drawer */}
        <div className="lg:hidden fixed bottom-20 left-4 z-40">
          <Sheet>
            <SheetTrigger asChild>
              <button
                className="flex items-center justify-center w-11 h-11 bg-[hsl(var(--mcc-surface-container-high))] text-foreground rounded-[var(--mcc-shape-lg)] shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-[var(--mcc-t-mid)] border border-border/30"
                aria-label="Sidebar öffnen"
              >
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px] bg-[hsl(var(--mcc-surface-container-lowest))]">
              <div className="h-full overflow-y-auto pt-4">
                <ForumSidebar />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* FAB – Create post */}
        {user && (
          <button
            onClick={() => navigate("/forum/new")}
            className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 flex items-center justify-center w-14 h-14 rounded-[var(--mcc-shape-lg)] bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-[var(--mcc-t-mid)] active:scale-95 xl:hidden"
            aria-label="Beitrag erstellen"
            style={{ boxShadow: 'var(--shadow-glow)' }}
          >
            <Plus className="w-6 h-6" />
          </button>
        )}

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>

        <MemoizedRightPanel />
        <ForumWelcomeDialog />
      </div>
    </div>
  );
};

export default ForumLayout;
