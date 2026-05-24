import { renderHook, act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSyncState } from "./useSyncState";
import type { SyncPayload } from "../types";

const service = vi.hoisted(() => ({
  pullSync: vi.fn(),
  pushSync: vi.fn(),
  subscribeSync: vi.fn(),
}));

vi.mock("../services/syncService", () => ({
  syncEnabled: true,
  syncApplying: { value: false },
  syncConfigError: null,
  pullSync: service.pullSync,
  pushSync: service.pushSync,
  subscribeSync: service.subscribeSync,
  mergeSyncPayloads: (local: SyncPayload) => local,
  syncPayloadsEqual: () => false,
}));

const emptyPayload = (): SyncPayload => ({
  version: 3,
  exportedAt: "2026-05-01T00:00:00.000Z",
  transactions: [],
  positionMeta: [],
  deletedIds: [],
});

describe("useSyncState", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    service.pushSync.mockResolvedValue(undefined);
    service.subscribeSync.mockResolvedValue(() => {});
  });

  it("does not reuse an in-flight sync from a different UUID during pairing", async () => {
    const firstId = "11111111-1111-4111-8111-111111111111";
    const secondId = "22222222-2222-4222-8222-222222222222";
    let resolveFirstPull: (payload: SyncPayload | null) => void = () => {};
    service.pullSync.mockImplementation((id: string) => {
      if (id === firstId) {
        return new Promise<SyncPayload | null>((resolve) => {
          resolveFirstPull = resolve;
        });
      }
      return Promise.resolve(null);
    });

    const { result } = renderHook(() =>
      useSyncState({ exportBackup: emptyPayload, applySync: vi.fn() })
    );

    let firstSetup: Promise<void>;
    await act(async () => {
      firstSetup = result.current.setupSync(firstId).catch(() => {});
    });

    await waitFor(() => expect(service.pullSync).toHaveBeenCalledWith(firstId));

    await act(async () => {
      void result.current.setupSync(secondId).catch(() => {});
    });

    await waitFor(() => expect(service.pullSync).toHaveBeenCalledWith(secondId));

    resolveFirstPull(null);
    await firstSetup!;
  });
});
