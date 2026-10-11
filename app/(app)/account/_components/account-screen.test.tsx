import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CONNECTED_ACCOUNTS } from "@/lib/fixtures/account";
import type { AccountInfo } from "@/lib/schemas/account";
import { axe } from "@/test/axe";

import type {
  AccountActionResult,
  EraseActionResult,
  ExportActionResult,
  ExportStatusResult,
} from "../actions";

const {
  updateConsentAction,
  updateRetentionAction,
  requestExportAction,
  exportRunStatusAction,
  eraseAccountAction,
} = vi.hoisted(() => ({
  updateConsentAction: vi.fn<(input: unknown) => Promise<AccountActionResult>>(),
  updateRetentionAction: vi.fn<(input: unknown) => Promise<AccountActionResult>>(),
  requestExportAction: vi.fn<() => Promise<ExportActionResult>>(),
  exportRunStatusAction: vi.fn<(input: unknown) => Promise<ExportStatusResult>>(),
  eraseAccountAction: vi.fn<() => Promise<EraseActionResult>>(),
}));

const { deleteUser, signOut, clerkState } = vi.hoisted(() => {
  const deleteUser = vi.fn(async () => {});
  return {
    deleteUser,
    signOut: vi.fn(async () => {}),
    clerkState: { user: { delete: deleteUser } as { delete: typeof deleteUser } | null },
  };
});

vi.mock("@/components/app-shell/topbar", () => ({ Topbar: () => null }));
const { routerPush } = vi.hoisted(() => ({ routerPush: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush, refresh: vi.fn(), prefetch: vi.fn(), replace: vi.fn() }),
}));
vi.mock("../actions", () => ({
  updateConsentAction,
  updateRetentionAction,
  requestExportAction,
  exportRunStatusAction,
  eraseAccountAction,
}));
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: clerkState.user }),
  useClerk: () => ({ signOut }),
}));

import { AccountScreen, DELETE_PHRASE } from "./account-screen";

const ACCOUNT: AccountInfo = {
  selfAudit: { granted: true, grantedAt: "2026-06-25T09:00:00Z", policyVersion: "2026-10-11" },
  art9: { granted: true, grantedAt: "2026-06-25T09:00:00Z", policyVersion: "2026-10-11" },
  decoy: { granted: false },
  retention: "retain",
  currentPolicyVersion: "2026-10-11",
  connectedAccounts: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  clerkState.user = { delete: deleteUser };
  updateConsentAction.mockResolvedValue({ ok: true, live: true });
  updateRetentionAction.mockResolvedValue({ ok: true, live: true });
  requestExportAction.mockResolvedValue({ ok: true, live: true, runId: undefined });
  exportRunStatusAction.mockResolvedValue({ ok: true, status: "queued" });
  eraseAccountAction.mockResolvedValue({ ok: true, live: true });
});

function renderScreen({
  overrides,
  live = true,
}: { overrides?: Partial<AccountInfo>; live?: boolean } = {}) {
  return render(
    <AccountScreen
      account={{ ...ACCOUNT, ...overrides }}
      connections={CONNECTED_ACCOUNTS}
      live={live}
      exportPollMs={25}
    />,
  );
}

async function armDelete(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Delete account/ }));
  await user.type(screen.getByLabelText(/to confirm/), DELETE_PHRASE);
  await user.click(screen.getByRole("button", { name: /Permanently delete/ }));
}

// Rendering AccountScreen transitively covers safety-section + the consent/retention sections.
describe("AccountScreen (live)", () => {
  it("renders the recorded consent standing, not hardcoded copy", () => {
    renderScreen({ overrides: { art9: { granted: false } } });
    expect(screen.getByRole("switch", { name: /Self-audit purpose/ })).toBeChecked();
    expect(screen.getByRole("switch", { name: /Special-category data/ })).not.toBeChecked();
    expect(screen.getByText("Granted Jun 25, 2026")).toBeInTheDocument(); // from grantedAt
    expect(screen.queryByText(/Demo data/)).not.toBeInTheDocument();
  });

  it("revoke flows through a dialog whose copy follows D4 (stops processing, deletes nothing)", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole("switch", { name: /Special-category data/ }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Revoking does not delete data/)).toBeInTheDocument();
    expect(screen.getByText(/sealed from view/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Revoke" }));
    await waitFor(() =>
      expect(updateConsentAction).toHaveBeenCalledWith({ purpose: "art9_inference", grant: false }),
    );
  });

  it("'Keep it' cancels the revoke without calling the backend", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole("switch", { name: /Special-category data/ }));
    await user.click(screen.getByRole("button", { name: "Keep it" }));
    expect(updateConsentAction).not.toHaveBeenCalled();
    expect(screen.getByRole("switch", { name: /Special-category data/ })).toBeChecked();
  });

  it("grants send the shown policy version (WC.1)", async () => {
    const user = userEvent.setup();
    renderScreen({ overrides: { art9: { granted: false } } });
    await user.click(screen.getByRole("switch", { name: /Special-category data/ }));
    await waitFor(() =>
      expect(updateConsentAction).toHaveBeenCalledWith({
        purpose: "art9_inference",
        grant: true,
        policyVersion: "2026-10-11",
      }),
    );
  });

  it("a committed revoke whose re-read failed still flips the switch (never 'nothing changed')", async () => {
    updateConsentAction.mockResolvedValueOnce({ ok: true, live: true }); // no account payload
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole("switch", { name: /Special-category data/ }));
    await user.click(screen.getByRole("button", { name: "Revoke" }));
    await waitFor(() =>
      expect(screen.getByRole("switch", { name: /Special-category data/ })).not.toBeChecked(),
    );
  });

  it("retention change round-trips through the action", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole("radio", { name: "Process, then discard" }));
    await waitFor(() =>
      expect(updateRetentionAction).toHaveBeenCalledWith({ retention: "discard" }),
    );
  });

  it("live connections have no fake revoke — managing them is labeled as coming", () => {
    renderScreen();
    expect(screen.queryByRole("button", { name: /Revoke access/ })).not.toBeInTheDocument();
    expect(screen.getAllByText("Managed in Connect").length).toBeGreaterThan(0);
  });

  it("export: the download link renders only after the run SUCCEEDS", async () => {
    const user = userEvent.setup();
    requestExportAction.mockResolvedValueOnce({
      ok: true,
      live: true,
      runId: "11111111-1111-4111-8111-111111111111",
    });
    exportRunStatusAction
      .mockResolvedValueOnce({ ok: true, status: "running" })
      .mockResolvedValue({ ok: true, status: "succeeded" });

    renderScreen(); // 25ms poll interval (test override), real timers
    await user.click(screen.getByRole("button", { name: /Request bundle/ }));
    expect(await screen.findByText(/Preparing your bundle/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /download it/ })).not.toBeInTheDocument();

    const link = await screen.findByRole("link", { name: /download it/ });
    expect(link).toHaveAttribute("href", "/api/export/11111111-1111-4111-8111-111111111111");
  });

  it("delete requires the TYPED phrase before the button arms (D5)", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole("button", { name: /Delete account/ }));

    const confirm = screen.getByRole("button", { name: /Permanently delete/ });
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText(/to confirm/), "delete");
    expect(confirm).toBeDisabled(); // partial phrase is not consent
    await user.clear(screen.getByLabelText(/to confirm/));
    await user.type(screen.getByLabelText(/to confirm/), DELETE_PHRASE);
    expect(confirm).toBeEnabled();
  });

  it("live delete runs D5 in order: backend erasure, THEN identity deletion, then sign-out", async () => {
    const user = userEvent.setup();
    renderScreen();
    await armDelete(user);

    await waitFor(() => expect(deleteUser).toHaveBeenCalled());
    expect(signOut).toHaveBeenCalledWith({ redirectUrl: "/" });
    const eraseOrder = eraseAccountAction.mock.invocationCallOrder[0];
    const clerkOrder = deleteUser.mock.invocationCallOrder[0];
    expect(eraseOrder).toBeLessThan(clerkOrder);
  });

  it("refuses to START an erasure when the Clerk user isn't available (no orphaned identity)", async () => {
    clerkState.user = null;
    const user = userEvent.setup();
    renderScreen();
    await armDelete(user);

    expect(eraseAccountAction).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("no false success: a failed identity deletion after our 204 is reported plainly", async () => {
    deleteUser.mockRejectedValueOnce(new Error("clerk down"));
    const user = userEvent.setup();
    renderScreen();
    await armDelete(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(/sign-in wasn.t removed/);
    expect(signOut).not.toHaveBeenCalled();
  });

  it("a failed sign-out AFTER identity deletion leaves the app without a false alert", async () => {
    signOut.mockRejectedValueOnce(new Error("session already gone"));
    const user = userEvent.setup();
    renderScreen();
    await armDelete(user);
    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("AccountScreen (demo)", () => {
  it("shows the demo banner and keeps every mutation local — no backend calls", async () => {
    const user = userEvent.setup();
    renderScreen({ live: false });

    expect(screen.getByText(/Demo data/)).toBeInTheDocument();

    await user.click(screen.getByRole("switch", { name: /Special-category data/ }));
    await user.click(screen.getByRole("button", { name: "Revoke" }));
    expect(screen.getByRole("switch", { name: /Special-category data/ })).not.toBeChecked();

    await user.click(screen.getByRole("radio", { name: "Process, then discard" }));
    await user.click(screen.getByRole("button", { name: /Request bundle/ }));

    expect(updateConsentAction).not.toHaveBeenCalled();
    expect(updateRetentionAction).not.toHaveBeenCalled();
    expect(requestExportAction).not.toHaveBeenCalled();
  });

  it("demo delete acknowledges WITHOUT erasing or touching the Clerk identity", async () => {
    const user = userEvent.setup();
    renderScreen({ live: false });
    await armDelete(user);

    expect(eraseAccountAction).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("demo connections keep the revoke affordance, honestly labeled local", async () => {
    const user = userEvent.setup();
    renderScreen({ live: false });
    const revokes = screen.getAllByRole("button", { name: /Revoke access/ });
    expect(revokes.length).toBeGreaterThan(0);
    await user.click(revokes[0]);
    expect(screen.getAllByRole("button", { name: /Revoke access/ })).toHaveLength(
      revokes.length - 1,
    );
  });

  it("has no a11y violations", async () => {
    const { container } = renderScreen({ live: false });
    expect((await axe(container)).violations).toEqual([]);
  });
});
