import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CONSENT_POLICIES, LATEST_POLICY_VERSION } from "@/lib/consent/policy";
import { axe } from "@/test/axe";

import type { GrantConsentsResult } from "../actions";

const { push, refresh, grantConsents } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  grantConsents: vi.fn<(input: unknown) => Promise<GrantConsentsResult>>(async () => ({
    ok: true,
    live: false,
    art9Granted: false,
  })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, back: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), refresh }),
}));
vi.mock("../actions", () => ({ grantConsents }));

import { OnboardingWizard } from "./onboarding-wizard";

beforeEach(() => {
  grantConsents.mockClear();
  refresh.mockClear();
  push.mockClear();
});

const POLICY = CONSENT_POLICIES[LATEST_POLICY_VERSION];

function renderWizard(policy: typeof POLICY | null = POLICY, live = true) {
  return render(
    <OnboardingWizard policyVersion={LATEST_POLICY_VERSION} policy={policy} live={live} />,
  );
}

async function toConsentStep(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Get started/ }));
}

async function checkRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("checkbox", { name: /auditing my own footprint/i }));
  await user.click(screen.getByRole("checkbox", { name: /can't recall existing copies/i }));
}

// Rendering OnboardingWizard transitively covers welcome, pillar, consent, connect-step.
describe("OnboardingWizard", () => {
  it("gates continue on the two REQUIRED points — Art. 9 stays optional", async () => {
    const user = userEvent.setup();
    renderWizard();
    await toConsentStep(user);

    const continueBtn = screen.getByRole("button", { name: /I consent & continue/ });
    expect(continueBtn).toBeDisabled();
    expect(screen.getByText(/Deny-by-default/)).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /auditing my own footprint/i }));
    expect(continueBtn).toBeDisabled(); // 1 of 2
    await user.click(screen.getByRole("checkbox", { name: /can't recall existing copies/i }));
    expect(continueBtn).toBeEnabled(); // Art. 9 unchecked, still allowed
    expect(screen.getByText(/continue without the optional Article 9 consent/)).toBeInTheDocument();
  });

  it("demo mode: no network call, says ACKNOWLEDGED (nothing stored), never 'recorded'", async () => {
    const user = userEvent.setup();
    renderWizard(POLICY, false);
    await toConsentStep(user);
    await checkRequired(user);
    await user.click(screen.getByRole("button", { name: /I consent & continue/ }));

    expect(await screen.findByText("Consent acknowledged — demo")).toBeInTheDocument();
    expect(grantConsents).not.toHaveBeenCalled();
    expect(screen.getByText(/nothing was stored/)).toBeInTheDocument();
    expect(screen.queryByText("Consent recorded")).not.toBeInTheDocument();
    expect(screen.getByText(/Article 9 — declined/)).toBeInTheDocument();
  });

  it("live grant: shows 'Consent recorded' with the backend's grant time", async () => {
    grantConsents.mockResolvedValueOnce({
      ok: true,
      live: true,
      grantedAt: "2026-10-11T17:30:00Z",
      art9Granted: true,
    });
    const user = userEvent.setup();
    renderWizard();
    await toConsentStep(user);
    await checkRequired(user);
    await user.click(screen.getByRole("checkbox", { name: /special-category data/i }));
    await user.click(screen.getByRole("button", { name: /I consent & continue/ }));

    await waitFor(() =>
      expect(grantConsents).toHaveBeenCalledWith({
        policyVersion: LATEST_POLICY_VERSION,
        art9: true,
      }),
    );
    expect(await screen.findByText("Consent recorded")).toBeInTheDocument();
    expect(screen.getByText(/Article 9 — explicit consent/)).toBeInTheDocument();
    // The receipt time is the backend's record, not the client clock.
    const stamp = new Date(Date.parse("2026-10-11T17:30:00Z"));
    const hour = stamp.getHours() % 12 || 12;
    expect(screen.getByText(new RegExp(`${hour}:30`))).toBeInTheDocument();
  });

  it("renders the receipt from what was RECORDED, not from the checkboxes", async () => {
    // Recant case: box unchecked, but the backend still holds a standing Art. 9 grant.
    grantConsents.mockResolvedValueOnce({ ok: true, live: true, art9Granted: true });
    const user = userEvent.setup();
    renderWizard();
    await toConsentStep(user);
    await checkRequired(user); // art9 left unchecked

    await user.click(screen.getByRole("button", { name: /I consent & continue/ }));

    expect(await screen.findByText(/Article 9 — explicit consent/)).toBeInTheDocument();
    expect(screen.queryByText(/stay sealed/)).not.toBeInTheDocument(); // no false-safety claim
  });

  it("reports a failed optional Art. 9 grant instead of faking it", async () => {
    grantConsents.mockResolvedValueOnce({
      ok: true,
      live: true,
      grantedAt: "2026-10-11T17:30:00Z",
      art9Granted: false,
      art9Error: true,
    });
    const user = userEvent.setup();
    renderWizard();
    await toConsentStep(user);
    await checkRequired(user);
    await user.click(screen.getByRole("checkbox", { name: /special-category data/i }));
    await user.click(screen.getByRole("button", { name: /I consent & continue/ }));

    expect(await screen.findByText(/couldn.t record the optional consent/)).toBeInTheDocument();
  });

  it("stale policy: clears every checkbox and re-asks against the refreshed text", async () => {
    grantConsents.mockResolvedValueOnce({ ok: false, code: "stale_policy" });
    const user = userEvent.setup();
    renderWizard();
    await toConsentStep(user);
    await checkRequired(user);
    await user.click(screen.getByRole("button", { name: /I consent & continue/ }));

    expect(await screen.findByText(/consent text changed/i)).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
    // New text requires new affirmative acts: every box is cleared, continue re-disabled.
    // (findByRole: the button label swaps back from "Recording…" asynchronously.)
    expect(await screen.findByRole("button", { name: /I consent & continue/ })).toBeDisabled();
    for (const box of screen.getAllByRole("checkbox")) expect(box).not.toBeChecked();
  });

  it("disables confirm and Back while the grant is in flight", async () => {
    let resolve!: (r: GrantConsentsResult) => void;
    grantConsents.mockImplementationOnce(
      () => new Promise<GrantConsentsResult>((r) => (resolve = r)),
    );
    const user = userEvent.setup();
    renderWizard();
    await toConsentStep(user);
    await checkRequired(user);
    await user.click(screen.getByRole("button", { name: /I consent & continue/ }));

    expect(await screen.findByRole("button", { name: /Recording…/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Back/ })).toBeDisabled();
    expect(grantConsents).toHaveBeenCalledTimes(1);

    resolve({ ok: true, live: false, art9Granted: false });
    expect(await screen.findByText("Consent acknowledged — demo")).toBeInTheDocument();
  });

  it("failure: says consent was NOT recorded and does not advance", async () => {
    grantConsents.mockResolvedValueOnce({ ok: false, code: "error" });
    const user = userEvent.setup();
    renderWizard();
    await toConsentStep(user);
    await checkRequired(user);
    await user.click(screen.getByRole("button", { name: /I consent & continue/ }));

    expect(await screen.findByText(/couldn't record your consent/i)).toBeInTheDocument();
    expect(screen.queryByText(/Consent (recorded|acknowledged)/)).not.toBeInTheDocument();
  });

  it("unknown policy version: never offers a grant the user can't read", async () => {
    const user = userEvent.setup();
    renderWizard(null);
    await toConsentStep(user);

    expect(screen.getByText("This app needs updating")).toBeInTheDocument();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.getByRole("button", { name: /I consent & continue/ })).toBeDisabled();
  });

  it("has no a11y violations (consent step and needs-updating state)", async () => {
    const user = userEvent.setup();
    const first = renderWizard();
    await toConsentStep(user);
    expect((await axe(first.container)).violations).toEqual([]);
    first.unmount();

    const { container: stale } = renderWizard(null);
    expect((await axe(stale)).violations).toEqual([]);
  });
});
