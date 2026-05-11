import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SyncPanel } from "./SyncPanel";

const showNotification = vi.fn();

vi.mock("../hooks/useNotification", () => ({
  useNotification: () => ({ showNotification }),
}));

describe("SyncPanel", () => {
  afterEach(() => {
    cleanup();
    showNotification.mockClear();
  });

  it("shows setup guidance when sync is not configured", () => {
    render(
      <SyncPanel
        syncEnabled={false}
        syncId={null}
        cloudStatus="idle"
        lastSyncAt={null}
        onSetupSync={vi.fn()}
        onDisconnectSync={vi.fn()}
        onTriggerSync={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("Sync not configured")).toBeTruthy();
    expect(screen.getByText(/VITE_SUPABASE_URL/)).toBeTruthy();
  });

  it("rejects invalid sync codes without calling setup", async () => {
    const setup = vi.fn();
    const user = userEvent.setup();
    render(
      <SyncPanel
        syncEnabled
        syncId={null}
        cloudStatus="idle"
        lastSyncAt={null}
        onSetupSync={setup}
        onDisconnectSync={vi.fn()}
        onTriggerSync={vi.fn()}
        onClose={vi.fn()}
      />
    );

    await user.type(screen.getByPlaceholderText("Paste sync code from another device"), "not-a-uuid");
    await user.click(screen.getByRole("button", { name: /connect/i }));

    expect(setup).not.toHaveBeenCalled();
    expect(screen.getByText("Paste the full UUID sync code from your other device.")).toBeTruthy();
  });

  it("accepts a valid UUID and closes after setup", async () => {
    const setup = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn();
    const user = userEvent.setup();
    const uuid = "11111111-1111-4111-8111-111111111111";
    render(
      <SyncPanel
        syncEnabled
        syncId={null}
        cloudStatus="idle"
        lastSyncAt={null}
        onSetupSync={setup}
        onDisconnectSync={vi.fn()}
        onTriggerSync={vi.fn()}
        onClose={close}
      />
    );

    await user.type(screen.getByPlaceholderText("Paste sync code from another device"), uuid);
    await user.click(screen.getByRole("button", { name: /connect/i }));

    expect(setup).toHaveBeenCalledWith(uuid);
    expect(close).toHaveBeenCalled();
  });
});
