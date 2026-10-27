import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthPage } from "./AuthPage";
import { AppShell } from "./AppShell";
import { useSession } from "./session";
import { useWorkspace, workspaceStart } from "./workspace";
import { EmptyState, ErrorState, Loading } from "../shared/ui/Common";
import type { Capability } from "../shared/api/contracts";
import { lazy, Suspense } from "react";
import type { ReactNode } from "react";

const AssistantPage = lazy(() =>
  import("../features/assistant/pages/AssistantPage").then((module) => ({
    default: module.AssistantPage,
  })),
);
const SettingsPage = lazy(() =>
  import("../features/settings/pages/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  })),
);

function Guard({
  capability,
  children,
}: {
  capability: Capability | Capability[];
  children: ReactNode;
}) {
  const { can } = useWorkspace();
  return (
    Array.isArray(capability) ? capability.some(can) : can(capability)
  ) ? (
    <Suspense fallback={<Loading />}>{children}</Suspense>
  ) : (
    <EmptyState
      icon="lock"
      title="Этот раздел недоступен"
      description="Ваши полномочия не включают это действие. Обратитесь к администратору пространства."
    />
  );
}

export function App() {
  const { session, loading, error, refresh } = useSession();
  const location = useLocation();
  if (loading)
    return (
      <div className="standalone">
        <Loading label="Открываем рабочее пространство…" />
      </div>
    );
  if (error)
    return (
      <div className="standalone">
        <ErrorState error={error} retry={refresh} />
      </div>
    );
  if (!session) return <AuthPage />;
  if (!session.workspaces.length)
    return (
      <div className="standalone">
        <EmptyState
          icon="lock"
          title="Нет доступного пространства"
          description="Учётная запись активна, но доступ к сети ещё не назначен. Обратитесь к администратору."
        />
      </div>
    );
  const workspace = session.workspaces[0];
  const start = workspaceStart(workspace);
  return (
    <Routes location={location}>
      <Route
        path="/"
        element={<Navigate to={`/w/${workspace.id}/${start}`} replace />}
      />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/w/:workspaceId" element={<AppShell />}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route
          path="assistant/:conversationId?"
          element={
            <Guard capability="assistant:use">
              <AssistantPage />
            </Guard>
          }
        />
        <Route
          path="settings"
          element={
            <Suspense fallback={<Loading />}>
              <SettingsPage />
            </Suspense>
          }
        />
        <Route
          path="*"
          element={
            <EmptyState
              title="Страница не найдена"
              description="Проверьте адрес или выберите раздел в навигации."
            />
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
