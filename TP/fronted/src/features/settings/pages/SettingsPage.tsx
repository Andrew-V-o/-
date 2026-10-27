import { useSearchParams } from "react-router-dom";
import { useSession } from "../../../app/session";
import { useWorkspace } from "../../../app/workspace";

import {
  PageHeader,
  Panel,
  roleLabels,
} from "../../../shared/ui/Common";

import { initials } from "../../../shared/ui/format";

import { SecurityPanel } from "../components/SecurityPanel";
import { CreateWorkspace } from "../components/CreateWorkspace";
import { roleDescriptions } from "../model/roles";

export function SettingsPage() {
  const workspace = useWorkspace();
  const { session } = useSession();
  const [search, setSearch] = useSearchParams();
  const tabs = [
    ["profile", "Мой доступ"]
    ,
    ...(workspace.can("members:manage")
      ? [
          ["members", "Команда"],
          ["stores", "Справочник точек"],
        ]
      : []),
  ];
  const tab = tabs.find(([key]) => key === search.get("tab"))?.[0] ?? "profile";
  return (
    <>
      <PageHeader
        eyebrow={workspace.name}
        title="Настройки пространства"
        description="Участники, полномочия и справочник точек. Роль определяет действия, область — доступные данные."
        actions={<CreateWorkspace />}
      />
      <nav className="page-tabs" aria-label="Разделы настроек">
        {tabs.map(([key, label]) => (
          <button
            type="button"
            key={key}
            className={tab === key ? "active" : ""}
            aria-current={tab === key ? "page" : undefined}
            onClick={() =>
              setSearch((previous) => {
                const next = new URLSearchParams(previous);
                next.set("tab", key);
                return next;
              })
            }
          >
            {label}
          </button>
        ))}
      </nav>
       {( 
        <div className="two-column">
          <Panel title="Ваша учётная запись">
            <div className="panel-body">
              <div className="account-summary">
                <span className="avatar large">
                  {initials(session?.user.name ?? "")}
                </span>
                <div>
                  <h3>{session?.user.name}</h3>
                  <p>{session?.user.email}</p>
                </div>
              </div>
              <dl className="metadata-list">
                <div>
                  <dt>Пространство</dt>
                  <dd>{workspace.name}</dd>
                </div>
                <div>
                  <dt>Роль</dt>
                  <dd>{roleLabels[workspace.role]}</dd>
                </div>
                <div>
                  <dt>Область</dt>
                  <dd>
                    {workspace.all_stores
                      ? "Все точки пространства"
                      : `Назначено точек: ${workspace.store_ids.length}`}
                  </dd>
                </div>
                <div>
                  <dt>Ассистент</dt>
                  <dd>
                    {workspace.can("assistant:use")
                      ? "Доступен в вашей области данных"
                      : "Доступ не назначен"}
                  </dd>
                </div>
              </dl>
              <p className="body-copy">{roleDescriptions[workspace.role]}</p>
            </div>
          </Panel>
          <SecurityPanel />
        </div>
      )}
    </>
  );
}
