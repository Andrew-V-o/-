import { useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "./session";
import { WorkspaceProvider, useWorkspace, workspaceStart } from "./workspace";
import type { Workspace } from "../shared/api/contracts";
import { EmptyState, ErrorState, roleLabels } from "../shared/ui/Common";
import { Icon } from "../shared/ui/Icon";
import { initials } from "../shared/ui/format";
import { useMobileNavigation } from "./shell/hooks/useMobileNavigation";
import { navigation } from "./shell/model/navigation";

export function AppShell() {
  const { session } = useSession();
  const { workspaceId } = useParams();
  const client = useQueryClient();
  const previous = useRef(workspaceId);
  const workspace = session?.workspaces.find((item) => item.id === workspaceId);
  useEffect(() => {
    if (previous.current !== workspaceId) {
      const old = previous.current;
      void client.cancelQueries({ queryKey: ["workspace", old] });
      client.removeQueries({ queryKey: ["workspace", old] });
      previous.current = workspaceId;
    }
  }, [workspaceId, client]);
  if (!workspace)
    return (
      <div className="standalone">
        <EmptyState
          icon="lock"
          title="Пространство недоступно"
          description="Оно не входит в вашу область доступа. Выберите доступное рабочее пространство."
          action={
            <Link className="button primary" to="/">
              На главную
            </Link>
          }
        />
      </div>
    );
  return (
    <WorkspaceProvider workspace={workspace}>
      <ShellContent
        key={`${workspace.id}:${workspace.role}:${workspace.all_stores}:${workspace.store_ids.join(",")}:${workspace.capabilities.join(",")}`}
        workspace={workspace}
      />
    </WorkspaceProvider>
  );
}

function ShellContent({ workspace }: { workspace: Workspace }) {
  const { session, logout } = useSession();
  const { can } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState<Error | null>(null);
  const {
    main,
    sidebar,
    menuButton,
    mobileViewport,
    drawerOpen,
    openNavigation,
    closeNavigation,
    navigateFromSidebar,
  } = useMobileNavigation(location.pathname);
  const scopeParams = new URLSearchParams();
  const currentParams = new URLSearchParams(location.search);
  for (const key of ["month", "stores", "metric"]) {
    const value = currentParams.get(key);
    if (value) scopeParams.set(key, value);
  }
  const scopeSearch = scopeParams.size ? `?${scopeParams.toString()}` : "";
  const active = navigation.find((item) => {
    const path = `/w/${workspace.id}/${item.path}`;
    return (
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
  });
  return (
    <div className={`app-shell ${drawerOpen ? "nav-open" : ""}`}>
      <aside
        id="app-navigation"
        className="sidebar"
        ref={sidebar}
        role={drawerOpen ? "dialog" : undefined}
        aria-modal={drawerOpen ? true : undefined}
        aria-label="Навигация по пространству"
        aria-hidden={mobileViewport && !drawerOpen ? true : undefined}
        inert={mobileViewport && !drawerOpen}
      >
        <div className="sidebar-heading">
          <button
            type="button"
            className="icon-button mobile-nav-close"
            aria-label="Закрыть навигацию"
            onClick={closeNavigation}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="workspace-switch">
          <label htmlFor="workspace-select">Рабочее пространство</label>
          <select
            id="workspace-select"
            value={workspace.id}
            onChange={(event) =>
              navigate(
                `/w/${event.target.value}/${workspaceStart(session!.workspaces.find((item) => item.id === event.target.value)!)}`,
              )
            }
          >
            {session?.workspaces.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <nav className="main-nav" aria-label="Основная навигация">
          {navigation
            .filter((item) => item.capability.some(can))
            .map((item) => (
              <NavLink
                to={{
                  pathname: `/w/${workspace.id}/${item.path}`,
                  search: scopeSearch,
                }}
                key={item.path}
                onClick={navigateFromSidebar}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.path === "assistant" && (
                  <span className="nav-tag">SQL</span>
                )}
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <NavLink
            className="settings-link"
            to={`/w/${workspace.id}/settings${scopeSearch}`}
            onClick={navigateFromSidebar}
          >
            <Icon name="settings" size={18} />
            Настройки
          </NavLink>
          <div className="profile">
            <span className="avatar">{initials(session?.user.name ?? "")}</span>
            <div>
              <strong>{session?.user.name}</strong>
              <span>{roleLabels[workspace.role]}</span>
            </div>
            <button
              className="icon-button"
              aria-label="Выйти"
              title="Выйти"
              onClick={() => {
                void logout().catch((error) => setLogoutError(error));
              }}
            >
              <Icon name="logout" size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace-main" inert={drawerOpen}>
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-menu"
              ref={menuButton}
              aria-label="Открыть навигацию"
              aria-controls="app-navigation"
              aria-expanded={drawerOpen}
              aria-haspopup="dialog"
              onClick={openNavigation}
            >
              <Icon name="menu" />
            </button>
            <span>{workspace.name}</span>
            <Icon name="chevron" size={13} />
            <strong>
              {active?.label ??
                (location.pathname === `/w/${workspace.id}/settings`
                  ? "Настройки"
                  : "Страница не найдена")}
            </strong>
          </div>
          <div className="topbar-actions">
            {can("assistant:use") && active?.path !== "assistant" && (
              <Link
                className="assistant-shortcut"
                to={`/w/${workspace.id}/assistant${scopeSearch}`}
                aria-label="Вопрос к данным"
              >
                <Icon name="assistant" size={17} />
                <span>Вопрос к данным</span>
              </Link>
            )}
          </div>
        </header>
        <main
          id="main-content"
          className="main-content"
          tabIndex={-1}
          ref={main}
        >
          {logoutError && <ErrorState error={logoutError} />}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
