import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { AgentsPage } from "../features/agents/AgentsPage";
import { AgentEditorPage } from "../features/agents/AgentEditorPage";
import { RunsPage } from "../features/runs/RunsPage";
import { RunDetailPage } from "../features/runs/RunDetailPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "agents", element: <AgentsPage /> },
      { path: "agents/new", element: <AgentEditorPage /> },
      { path: "agents/:id", element: <AgentEditorPage /> },
      { path: "runs", element: <RunsPage /> },
      { path: "runs/:id", element: <RunDetailPage /> },
    ],
  },
]);
