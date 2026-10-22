import type { ReactNode } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import {
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from "./useTransactions";
import { useUpdateAccount, useDeleteAccount } from "./useAccounts";
import { apiClient } from "../lib/api-client";

vi.mock("../lib/api-client", () => ({ apiClient: vi.fn() }));
afterEach(cleanup);

function setup() {
  const client = new QueryClient();
  for (const key of [
    "transactions",
    "dashboard",
    "accounts",
    "budgets",
    "savings-goals",
  ]) {
    client.setQueryData([key], { value: "previous" });
  }
  vi.mocked(apiClient).mockResolvedValue({});
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

it("refreshes all affected cached figures after creating a transaction", async () => {
  const { client, wrapper } = setup();
  const { result } = renderHook(useCreateTransaction, { wrapper });
  await act(async () => {
    await result.current.mutateAsync({
      accountId: 1,
      categoryId: 1,
      type: "expense",
      amount: 100,
      transactionDate: "2026-10-22",
    });
  });
  for (const key of [
    "transactions",
    "dashboard",
    "accounts",
    "budgets",
    "savings-goals",
  ])
    expect(client.getQueryState([key])?.isInvalidated).toBe(true);
});

it("refreshes budget and savings data after editing a transaction to a transfer", async () => {
  const { client, wrapper } = setup();
  const { result } = renderHook(useUpdateTransaction, { wrapper });
  await act(async () => {
    await result.current.mutateAsync({
      id: 1,
      body: {
        accountId: 1,
        transferToAccountId: 2,
        type: "transfer",
        amount: 100,
        transactionDate: "2026-10-22",
      },
    });
  });
  for (const key of ["budgets", "savings-goals"])
    expect(client.getQueryState([key])?.isInvalidated).toBe(true);
});

it("refreshes dependent figures after deleting a transaction", async () => {
  const { client, wrapper } = setup();
  const { result } = renderHook(useDeleteTransaction, { wrapper });
  await act(async () => {
    await result.current.mutateAsync(1);
  });
  for (const key of ["budgets", "savings-goals"])
    expect(client.getQueryState([key])?.isInvalidated).toBe(true);
});

it("refreshes savings after an initial balance change", async () => {
  const { client, wrapper } = setup();
  const { result } = renderHook(useUpdateAccount, { wrapper });
  await act(async () => {
    await result.current.mutateAsync({
      id: 1,
      body: { name: "Cash", type: "cash", initialBalance: 500 },
    });
  });
  expect(client.getQueryState(["savings-goals"])?.isInvalidated).toBe(true);
});

it("refreshes goal account state after an account is deactivated", async () => {
  const { client, wrapper } = setup();
  const { result } = renderHook(useDeleteAccount, { wrapper });
  await act(async () => {
    await result.current.mutateAsync(1);
  });
  expect(client.getQueryState(["savings-goals"])?.isInvalidated).toBe(true);
});
