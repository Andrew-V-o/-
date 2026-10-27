import { useMutation, useQuery } from "@tanstack/react-query";
import { get, post } from "../shared/api/client";
import type { AuthStatus, Session } from "../shared/api/contracts";
import { useSession } from "./session";
import {
  Button,
  Field,
  Form,
  formText,
  InlineError,
  Loading,
  ErrorState,
} from "../shared/ui/Common";

export function AuthPage() {
  const { authenticate } = useSession();
  const status = useQuery({
    queryKey: ["auth-status"],
    queryFn: () => get<AuthStatus>("/auth/status"),
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: (body: Record<string, string>) =>
      post<Session>(
        status.data?.bootstrap_required ? "/auth/bootstrap" : "/auth/login",
        body,
      ),
    onSuccess: authenticate,
  });
  const setup = status.data?.bootstrap_required;
  return (
    <main className="auth-layout">
      <section className="auth-story">
      </section>
      <section className="auth-form-area">
        <div className="auth-card">
          <h2>{setup ? "Первое рабочее пространство" : "С возвращением"}</h2>
          <p>
            {setup
              ? "Создайте учётную запись руководителя. Данные и участников можно добавить после входа."
              : "Войдите, чтобы продолжить работу с данными вашей сети."}
          </p>
          {status.isPending ? (
            <Loading />
          ) : status.error ? (
            <ErrorState
              error={status.error}
              retry={() => void status.refetch()}
            />
          ) : (
            <Form
              onSubmit={(form) => {
                const body: Record<string, string> = {
                  email: formText(form, "email"),
                  password: String(new FormData(form).get("password") ?? ""),
                };
                if (setup) {
                  body.name = formText(form, "name");
                  body.workspace_name = formText(form, "workspace_name");
                  if (status.data.bootstrap_token_required)
                    body.bootstrap_token = formText(form, "bootstrap_token");
                }
                mutation.mutate(body);
              }}
            >
              {setup && (
                <>
                  <Field label="Ваше имя">
                    <input
                      name="name"
                      autoComplete="name"
                      required
                      maxLength={120}
                    />
                  </Field>
                  <Field label="Название сети">
                    <input
                      name="workspace_name"
                      required
                      maxLength={160}
                      placeholder="Например, Кофейные истории"
                    />
                  </Field>
                </>
              )}
              <Field label="Электронная почта">
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  maxLength={254}
                  placeholder="name@company.ru"
                />
              </Field>
              <Field
                label="Пароль"
                hint={setup ? "Не менее 12 символов." : undefined}
              >
                <input
                  name="password"
                  type="password"
                  autoComplete={setup ? "new-password" : "current-password"}
                  required
                  minLength={setup ? 12 : undefined}
                  maxLength={256}
                />
              </Field>
              <InlineError error={mutation.error} />
              <Button
                type="submit"
                loading={mutation.isPending}
                className="full-width"
              >
                {setup ? "Создать пространство" : "Войти"}
              </Button>
            </Form>
          )}
        </div>
      </section>
    </main>
  );
}
