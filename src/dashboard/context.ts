import { useOutletContext } from "react-router-dom";
import type { DashboardContext } from "./DashboardLayout";

/** What the dashboard frame knows: role, user, open items */
export const useDashboard = () => useOutletContext<DashboardContext>();
