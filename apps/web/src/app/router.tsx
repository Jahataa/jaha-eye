import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { AgentsPage } from "../features/agents/AgentsPage";
import { AgentEditorPage } from "../features/agents/AgentEditorPage";
import { RunsPage } from "../features/runs/RunsPage";
import { RunDetailPage } from "../features/runs/RunDetailPage";
import { OrchestrationsPage } from "../features/orchestrations/OrchestrationsPage";
import { OrchestrationEditorPage } from "../features/orchestrations/OrchestrationEditorPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "agents", element: <AgentsPage /> },
      { path: "agents/new", element: <AgentEditorPage /> },
      { path: "agents/:id", element: <AgentEditorPage /> },
      { path: "orchestrations", element: <OrchestrationsPage /> },
      { path: "orchestrations/new", element: <OrchestrationEditorPage /> },
      { path: "orchestrations/:id", element: <OrchestrationEditorPage /> },
      { path: "runs", element: <RunsPage /> },
      { path: "runs/:id", element: <RunDetailPage /> },
    ],
  },
]);
