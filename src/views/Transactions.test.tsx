import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Transactions } from "./Transactions";
import type { Transaction } from "../types";

const tx: Transaction = {
  id: "tx-1",
  month: "2026-05",
  ticker: "VOO",
  amount: 1000,
  type: "buy",
  shares: 10,
  pricePerShare: 100,
  timestamp: "2026-05-01T00:00:00.000Z",
};

describe("Transactions", () => {
  it("lets edits correct share and price fields used by cost-basis metrics", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();

    render(
      <Transactions
        transactions={[tx]}
        availableMonths={["2026-05"]}
        tickers={["VOO"]}
        onRequestAdd={vi.fn()}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />
    );

    await user.click(screen.getAllByRole("button", { name: /edit/i })[0]);
    await user.clear(screen.getAllByLabelText(/shares/i)[0]);
    await user.type(screen.getAllByLabelText(/shares/i)[0], "12");
    await user.clear(screen.getAllByLabelText(/price/i)[0]);
    await user.type(screen.getAllByLabelText(/price/i)[0], "101.50");
    await user.click(screen.getAllByRole("button", { name: /save/i })[0]);

    expect(onUpdate).toHaveBeenCalledWith(
      "tx-1",
      expect.objectContaining({
        shares: 12,
        pricePerShare: 101.5,
      })
    );
  });
});
