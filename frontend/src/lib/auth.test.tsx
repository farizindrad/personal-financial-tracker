import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./auth";
import { apiClient } from "./api-client";

let owner: number | null;
let resolveOld: ((response: Response) => void) | undefined;
let deferAccounts = false;
let rejectLogout = false;
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status });

function renderAuth() {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

function Probe() {
  const auth = useAuth();
  const client = useQueryClient();
  const account = useQuery({
    queryKey: ["accounts"],
    queryFn: () => apiClient<{ name: string }>("/accounts"),
    enabled: auth.status === "authenticated",
  });
  return (
    <>
      <p>{auth.status}</p>
      {auth.status === "authenticated" && <p>{account.data?.name}</p>}
      <button onClick={() => void auth.logout().catch(() => undefined)}>
        Logout
      </button>
      <button onClick={() => void auth.login("b@example.test", "password")}>
        Login B
      </button>
      <button
        onClick={() =>
          void client.invalidateQueries({ queryKey: ["accounts"] })
        }
      >
        Refresh
      </button>
    </>
  );
}

beforeEach(() => {
  owner = 1;
  deferAccounts = false;
  rejectLogout = false;
  resolveOld = undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const path = url.replace("/api", "");
      if (path === "/auth/config")
        return json({ demo: false, demoEmail: null });
      if (path === "/auth/me")
        return json({ user: { id: owner, email: "a@example.test" } });
      if (path === "/auth/login") {
        owner = 2;
        return json({ user: { id: 2, email: "b@example.test" } });
      }
      if (path === "/auth/logout") {
        if (rejectLogout) throw new Error("Offline");
        owner = null;
        return json({ ok: true });
      }
      if (deferAccounts)
        return new Promise<Response>((resolve) => {
          resolveOld = resolve;
        });
      return json({ name: `Account ${owner}` });
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("does not reuse fresh cached financial data when switching users", async () => {
  renderAuth();
  await screen.findByText("Account 1");
  fireEvent.click(screen.getByText("Logout"));
  await screen.findByText("unauthenticated");
  fireEvent.click(screen.getByText("Login B"));
  await screen.findByText("Account 2");
  expect(screen.queryByText("Account 1")).toBeNull();
});

it("ignores an old financial response after logout and login", async () => {
  renderAuth();
  await screen.findByText("Account 1");
  deferAccounts = true;
  fireEvent.click(screen.getByText("Refresh"));
  await waitFor(() => expect(resolveOld).toBeDefined());
  fireEvent.click(screen.getByText("Logout"));
  await screen.findByText("unauthenticated");
  deferAccounts = false;
  fireEvent.click(screen.getByText("Login B"));
  await screen.findByText("Account 2");
  await act(async () => {
    resolveOld?.(json({ name: "Account 1 stale" }));
  });
  expect(screen.queryByText("Account 1 stale")).toBeNull();
  expect(screen.getByText("Account 2")).toBeDefined();
});

it("removes financial data even if the logout request fails", async () => {
  renderAuth();
  await screen.findByText("Account 1");
  rejectLogout = true;
  fireEvent.click(screen.getByText("Logout"));
  await screen.findByText("unauthenticated");
  expect(screen.queryByText("Account 1")).toBeNull();
});

it("expires the local session when an authenticated API returns 401", async () => {
  renderAuth();
  await screen.findByText("Account 1");
  vi.mocked(fetch).mockResolvedValue(json({ message: "Expired" }, 401));
  await act(async () => {
    await apiClient("/transactions").catch(() => undefined);
  });
  await screen.findByText("unauthenticated");
  expect(screen.queryByText("Account 1")).toBeNull();
});
