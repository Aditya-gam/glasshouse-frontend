"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Breadcrumb } from "@/components/app-shell/breadcrumb";
import { Topbar } from "@/components/app-shell/topbar";
import { useLens } from "@/components/app-shell/use-lens";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import type { ConnectedAccount } from "@/lib/fixtures/account";
import type { AccountInfo, ConsentPurpose, Retention } from "@/lib/schemas/account";

import {
  eraseAccountAction,
  exportRunStatusAction,
  requestExportAction,
  updateConsentAction,
  updateRetentionAction,
} from "../actions";
import { SafetySection } from "./safety-section";

import "../account.css";

type AccountDialog = "revoke-self_audit" | "revoke-art9_inference" | "decoy" | "delete" | null;

/** The exact phrase the delete confirmation requires (D5: a TYPED confirmation). */
export const DELETE_PHRASE = "delete my account";

const EXPORT_POLL_MS = 3000;
const EXPORT_POLL_MAX = 60; // ~3 minutes at the default interval, then re-request

const RETENTION: { key: Retention; label: string }[] = [
  { key: "retain", label: "Retain, encrypted" },
  { key: "discard", label: "Process, then discard" },
];

type ConsentStateKey = "selfAudit" | "art9" | "decoy";
const PURPOSE_KEYS: Record<ConsentPurpose, ConsentStateKey> = {
  self_audit: "selfAudit",
  art9_inference: "art9",
  decoy: "decoy",
};

interface AccountScreenProps {
  account: AccountInfo;
  connections: ConnectedAccount[];
  /** False = demo fixtures (backend absent): mutations stay local and say so. */
  live: boolean;
  /** Export-run poll interval; overridden only by tests. */
  exportPollMs?: number;
}

function RetentionDesc({ retention }: { retention: Retention }) {
  if (retention === "retain") {
    return (
      <p className="ret-current">
        Your imported data is kept <b>encrypted</b> so you can re-run the audit and prove your
        before → after over time. Crypto-shred it anytime.
      </p>
    );
  }
  return (
    <p className="ret-current">
      We analyze, then <b>delete the raw data immediately</b> — keeping only the findings, not your
      content. Re-running later means importing again.
    </p>
  );
}

function grantedMeta(state: AccountInfo["selfAudit"]): string | null {
  if (!state.granted) return null;
  if (!state.grantedAt) return "Granted";
  try {
    const date = new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(state.grantedAt));
    return `Granted ${date}`;
  } catch {
    return "Granted";
  }
}

type ExportState =
  | { phase: "idle" }
  | { phase: "preparing"; runId: string }
  | { phase: "ready"; runId: string }
  | { phase: "failed" };

export function AccountScreen({
  account: initial,
  connections,
  live,
  exportPollMs = EXPORT_POLL_MS,
}: AccountScreenProps) {
  const { lens } = useLens();
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [account, setAccount] = useState(initial);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>(connections);
  const [dialog, setDialog] = useState<AccountDialog>(null);
  const [deleteTyped, setDeleteTyped] = useState("");
  const [exportState, setExportState] = useState<ExportState>({ phase: "idle" });
  const [identityError, setIdentityError] = useState(false);
  const [pending, startTransition] = useTransition();
  const pollCount = useRef(0);

  // A router.refresh() (e.g. after a stale policy version) re-renders the server page
  // with fresh data — adopt it instead of keeping pre-refresh client state. (The
  // render-phase "adjust state when a prop changes" pattern, not an effect.)
  const [adoptedInitial, setAdoptedInitial] = useState(initial);
  if (adoptedInitial !== initial) {
    setAdoptedInitial(initial);
    setAccount(initial);
  }

  // Poll the export run (D2: exports are runs) until the bundle is downloadable.
  useEffect(() => {
    if (exportState.phase !== "preparing") return;
    const { runId } = exportState;
    const timer = setInterval(async () => {
      pollCount.current += 1;
      if (pollCount.current > EXPORT_POLL_MAX) {
        setExportState({ phase: "failed" });
        return;
      }
      const result = await exportRunStatusAction({ runId });
      if (!result.ok) return; // transient — keep polling until the cap
      if (result.status === "succeeded") setExportState({ phase: "ready", runId });
      else if (result.status === "failed") setExportState({ phase: "failed" });
    }, exportPollMs);
    return () => clearInterval(timer);
  }, [exportState, exportPollMs]);

  const localConsentMerge = (purpose: ConsentPurpose, grant: boolean) =>
    setAccount((a) => ({ ...a, [PURPOSE_KEYS[purpose]]: { granted: grant } }));

  const applyConsent = (purpose: ConsentPurpose, grant: boolean, label: string) => {
    // Demo mode never touches the network: acknowledge locally and say so.
    if (!live) {
      localConsentMerge(purpose, grant);
      setDialog(null);
      toast(
        grant
          ? `${label} consent granted (demo — nothing stored)`
          : `${label} consent revoked (demo — nothing stored)`,
      );
      return;
    }
    startTransition(async () => {
      const result = await updateConsentAction({
        purpose,
        grant,
        ...(grant ? { policyVersion: account.currentPolicyVersion } : {}),
      });
      if (!result.ok) {
        if (result.code === "stale_policy") {
          toast.error("The consent terms changed — the page has refreshed; please try again.");
          setDialog(null);
          router.refresh(); // re-reads the account; the effect above adopts the new version
        } else {
          toast.error(`We couldn't update the ${label} consent — nothing changed. Try again.`);
        }
        return;
      }
      if (result.account) setAccount(result.account);
      else localConsentMerge(purpose, grant); // committed; the re-read failed (rare)
      toast(
        grant
          ? `${label} consent granted`
          : `${label} consent revoked — processing stops; your data stays until you delete it`,
      );
      setDialog(null);
    });
  };

  const setRet = (key: Retention) => {
    if (key === account.retention) return;
    const label =
      key === "retain" ? "Retention: keep encrypted" : "Retention: process, then discard";
    if (!live) {
      setAccount((a) => ({ ...a, retention: key }));
      toast(`${label} (demo — nothing stored)`);
      return;
    }
    startTransition(async () => {
      const result = await updateRetentionAction({ retention: key });
      if (!result.ok) {
        toast.error("We couldn't change retention — nothing changed. Try again.");
        return;
      }
      setAccount(result.account ?? { ...account, retention: key });
      toast(label);
    });
  };

  const requestBundle = () => {
    if (!live) {
      toast("Export requested (demo — nothing stored, no bundle is prepared)");
      return;
    }
    startTransition(async () => {
      const result = await requestExportAction();
      if (!result.ok) {
        toast.error("We couldn't start the export — try again.");
        return;
      }
      if (result.runId) {
        pollCount.current = 0;
        setExportState({ phase: "preparing", runId: result.runId });
        toast("Preparing your bundle — the download appears here when it's ready");
      } else {
        toast("Export requested (demo — nothing stored)");
      }
    });
  };

  const confirmDelete = () => {
    setIdentityError(false);
    if (!live) {
      setDialog(null);
      toast("Account deletion acknowledged (demo — nothing stored, nothing deleted)");
      return;
    }
    // D5 needs BOTH steps; refuse to start an erasure we can't finish.
    if (!user) {
      toast.error("Your sign-in session isn't ready — reload the page and try again.");
      return;
    }
    const clerkUser = user;
    startTransition(async () => {
      const result = await eraseAccountAction();
      if (!result.ok) {
        toast.error("Deletion failed — nothing was removed. Try again.");
        return;
      }
      // D5 step 2: our data is erased (204); remove the Clerk identity, then sign out.
      try {
        await clerkUser.delete();
      } catch {
        // No false success: the data is gone, the sign-in identity is not.
        setIdentityError(true);
        setDialog(null);
        return;
      }
      try {
        await signOut({ redirectUrl: "/" });
      } catch {
        // Identity IS deleted; the session is dead either way — leave the app.
        router.push("/");
      }
    });
  };

  const revokeConnection = (id: string) => {
    // Demo-only affordance: connector revocation ships with M6.
    setAccounts((a) => a.filter((x) => x.id !== id));
    toast("Disconnected (demo — nothing stored)");
  };

  const toggleConsent = (purpose: Exclude<ConsentPurpose, "decoy">) => {
    const state = purpose === "self_audit" ? account.selfAudit : account.art9;
    if (state.granted) setDialog(`revoke-${purpose}`);
    else applyConsent(purpose, true, purpose === "self_audit" ? "Self-audit" : "Article 9");
  };

  const toggleDecoy = () => {
    if (!account.decoy.granted) setDialog("decoy");
    else applyConsent("decoy", false, "Decoy-mode");
  };

  return (
    <div>
      <Topbar
        center={
          <Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Account" }]} />
        }
      />

      <main id="main-content" tabIndex={-1} className="account-wrap">
        <Link className="acct-back" href="/dashboard">
          <Icon name="arrow-left" size={15} /> Back to dashboard
        </Link>
        <h1 className="account-title">Account &amp; data rights</h1>
        <p className="account-sub">
          Everything we hold is yours to see, change, export, or erase. Nothing here is hidden.
        </p>
        {!live && (
          <p className="demo-banner" role="status">
            <Icon name="circle-minus" size={14} /> Demo data — the backend isn&rsquo;t connected, so
            nothing on this screen is stored or real.
          </p>
        )}

        {lens === "atrisk" && (
          <div className="sec safety-sec" id="safety" style={{ marginTop: "var(--space-6)" }}>
            <SafetySection emphasized />
          </div>
        )}

        <section className="sec" id="consents">
          <div className="sec-head">
            <span className="sec-head-ic">
              <Icon name="check" size={17} />
            </span>
            <h2>Consents</h2>
          </div>
          <p className="sec-desc">
            What you&rsquo;ve agreed to. Revoke anytime — revoking stops processing; it does not
            delete data (deletion is below).
          </p>
          <div className="sec-card">
            <div className="row">
              <span className="row-ic">
                <Icon name="scan" size={18} />
              </span>
              <div className="row-body">
                <div className="row-name">
                  Self-audit purpose{" "}
                  {account.selfAudit.granted ? (
                    <span className="status-pill status-on">Granted</span>
                  ) : (
                    <span className="status-pill status-off">Revoked</span>
                  )}
                </div>
                <div className="row-desc">
                  Process your footprint to reveal what others can infer about you.
                </div>
                {grantedMeta(account.selfAudit) && (
                  <div className="row-meta">{grantedMeta(account.selfAudit)}</div>
                )}
              </div>
              <div className="row-action">
                <Switch
                  checked={account.selfAudit.granted}
                  disabled={pending}
                  onCheckedChange={() => toggleConsent("self_audit")}
                  aria-label="Self-audit purpose consent"
                />
              </div>
            </div>
            <div className="row">
              <span className="row-ic">
                <Icon name="lock" size={18} />
              </span>
              <div className="row-body">
                <div className="row-name">
                  Special-category data <span className="status-pill status-art9">Art. 9</span>
                </div>
                <div className="row-desc">
                  Explicit consent to process data that may reveal special categories — e.g.
                  birthplace.
                </div>
                {grantedMeta(account.art9) && (
                  <div className="row-meta">{grantedMeta(account.art9)}</div>
                )}
              </div>
              <div className="row-action">
                <Switch
                  checked={account.art9.granted}
                  disabled={pending}
                  onCheckedChange={() => toggleConsent("art9_inference")}
                  aria-label="Special-category data consent"
                />
              </div>
            </div>
            <div className="row">
              <span className="row-ic">
                <Icon name="triangle-alert" size={18} />
              </span>
              <div className="row-body">
                <div className="row-name">
                  Decoy mode{" "}
                  {account.decoy.granted ? (
                    <span className="status-pill status-on">On</span>
                  ) : (
                    <span className="status-pill status-off">Off</span>
                  )}
                </div>
                <div className="row-desc">
                  Allow suggestions that publish a falsehood to mislead an adversary. Off by
                  default; you confirm again each use.
                </div>
              </div>
              <div className="row-action">
                <Switch
                  checked={account.decoy.granted}
                  disabled={pending}
                  onCheckedChange={toggleDecoy}
                  aria-label="Decoy mode"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="sec" id="retention">
          <div className="sec-head">
            <span className="sec-head-ic">
              <Icon name="archive" size={17} />
            </span>
            <h2>Data retention</h2>
          </div>
          <p className="sec-desc">How long we hold your imported content.</p>
          <div className="sec-card">
            <div className="ret-seg-wrap">
              <div className="seg" role="radiogroup" aria-label="Data retention">
                {RETENTION.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    className={"seg-btn" + (account.retention === r.key ? " seg-btn--active" : "")}
                    role="radio"
                    aria-checked={account.retention === r.key}
                    disabled={pending}
                    onClick={() => setRet(r.key)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <RetentionDesc retention={account.retention} />
            </div>
          </div>
        </section>

        <section className="sec" id="connected">
          <div className="sec-head">
            <span className="sec-head-ic">
              <Icon name="link" size={17} />
            </span>
            <h2>Connected accounts</h2>
          </div>
          <p className="sec-desc">
            Read-only connections.{" "}
            {live
              ? "Managing connections arrives with the connector update."
              : "Revoking clears the encrypted token immediately."}
          </p>
          <div className="sec-card">
            {accounts.length === 0 && (
              <div
                className="sec-card-pad"
                style={{ color: "var(--muted-foreground)", fontSize: "13.5px" }}
              >
                No connected accounts.{" "}
                <Link className="link-btn" href="/connect">
                  Connect one →
                </Link>
              </div>
            )}
            {accounts.map((a) => (
              <div className="row" key={a.id}>
                <span className="row-ic">
                  <Icon name={a.icon} size={18} />
                </span>
                <div className="row-body">
                  <div className="row-name">
                    {a.name}{" "}
                    <span className="status-pill status-on">{a.status ?? "Read-only"}</span>
                  </div>
                  <div className="row-desc">{a.handle}</div>
                  {a.date && <div className="row-meta">{a.date}</div>}
                </div>
                <div className="row-action">
                  {live ? (
                    <span className="row-meta">Managed in Connect</span>
                  ) : (
                    <button
                      type="button"
                      className="link-btn link-btn--danger"
                      onClick={() => revokeConnection(a.id)}
                    >
                      Revoke access
                    </button>
                  )}
                </div>
              </div>
            ))}
            {accounts.length > 0 && (
              <div className="sec-card-pad" style={{ borderTop: "1px solid var(--border)" }}>
                <Link className="link-btn" href="/connect">
                  + Connect another source
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="sec" id="export">
          <div className="sec-head">
            <span className="sec-head-ic">
              <Icon name="download" size={17} />
            </span>
            <h2>Export your data</h2>
          </div>
          <p className="sec-desc">A complete copy of everything we hold about you (DSAR).</p>
          <div className="sec-card">
            <div className="export-row">
              <div className="row-body">
                <div className="row-name">Download my data bundle</div>
                <ul className="export-list">
                  <li>Your imported items and photos</li>
                  <li>Every inference, with evidence and calibrated reliability</li>
                  <li>Your consents and the audit log</li>
                </ul>
                {exportState.phase === "preparing" && (
                  <p className="row-meta" role="status">
                    Preparing your bundle… the download link appears here when it&rsquo;s ready.
                  </p>
                )}
                {exportState.phase === "ready" && (
                  <p className="row-meta" role="status">
                    Your bundle is ready:{" "}
                    <a className="link-btn" href={`/api/export/${exportState.runId}`} download>
                      download it
                    </a>{" "}
                    (owner-only link, expires).
                  </p>
                )}
                {exportState.phase === "failed" && (
                  <p className="row-meta" role="status">
                    The export didn&rsquo;t finish — request it again.
                  </p>
                )}
              </div>
              <Button variant="secondary" disabled={pending} onClick={requestBundle}>
                <Icon name="download" size={15} /> Request bundle
              </Button>
            </div>
          </div>
        </section>

        {lens !== "atrisk" && (
          <section className="sec safety-sec" id="safety">
            <SafetySection />
          </section>
        )}

        <section className="sec danger-sec" id="delete">
          <div className="sec-head">
            <span className="sec-head-ic">
              <Icon name="trash-2" size={17} />
            </span>
            <h2>Delete account</h2>
          </div>
          <p className="sec-desc">Remove your account and everything tied to it.</p>
          <div className="sec-card">
            <div className="danger-pad">
              <ul className="danger-list">
                <li>
                  <Icon name="key" size={16} />
                  <span>
                    <b>Crypto-shred.</b> We destroy your encryption key, so your encrypted data
                    becomes permanently unreadable — even to us.
                  </span>
                </li>
                <li>
                  <Icon name="trash-2" size={16} />
                  <span>
                    <b>Cascade delete.</b> Your imported items, inferences, consents, and
                    connected-account tokens are all removed.
                  </span>
                </li>
                <li>
                  <Icon name="shield-alert" size={16} />
                  <span>
                    <b>Irreversible.</b> This can&rsquo;t be undone, and there&rsquo;s no recovery.
                  </span>
                </li>
              </ul>
              <div className="danger-caveat">
                <Icon name="shield-alert" size={16} />
                <span>
                  <b>Honest caveat:</b> deleting your account here can&rsquo;t recall copies others
                  already made — screenshots, archives, or reposts. It removes what <i>we</i> hold,
                  not what&rsquo;s already out in the world.
                </span>
              </div>
              {identityError && (
                <div className="danger-caveat" role="alert">
                  <Icon name="shield-alert" size={16} />
                  <span>
                    <b>Your data is erased, but your sign-in wasn&rsquo;t removed.</b> The deletion
                    of your encrypted data and key succeeded; removing the sign-in identity failed.
                    Sign out and remove the sign-in from your identity provider.
                  </span>
                </div>
              )}
              <Button
                className="btn-danger"
                onClick={() => {
                  setDeleteTyped("");
                  setDialog("delete");
                }}
              >
                <Icon name="trash-2" size={15} /> Delete account
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Revoke self_audit / art9 */}
      <Dialog
        open={dialog === "revoke-self_audit" || dialog === "revoke-art9_inference"}
        onOpenChange={(open) => {
          if (!open && !pending) setDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === "revoke-art9_inference"
                ? "Revoke special-category consent?"
                : "Revoke the self-audit consent?"}
            </DialogTitle>
            <DialogDescription>You can grant it again anytime.</DialogDescription>
          </DialogHeader>
          <p
            style={{
              margin: 0,
              fontSize: "13.5px",
              lineHeight: 1.55,
              color: "var(--muted-foreground)",
            }}
          >
            {dialog === "revoke-art9_inference"
              ? "We'll stop processing data that may reveal special categories (like birthplace), and existing special-category findings are sealed from view. Revoking does not delete data — deletion is the separate step below."
              : "This stops all processing immediately. Your audit pauses and we won't run further inference until you grant it again. Revoking does not delete data — deletion is the separate step below."}
          </p>
          <DialogFooter>
            <Button variant="secondary" disabled={pending} onClick={() => setDialog(null)}>
              Keep it
            </Button>
            <Button
              className="btn-warn"
              disabled={pending}
              onClick={() =>
                applyConsent(
                  dialog === "revoke-art9_inference" ? "art9_inference" : "self_audit",
                  false,
                  dialog === "revoke-art9_inference" ? "Article 9" : "Self-audit",
                )
              }
            >
              {pending ? "Revoking…" : "Revoke"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decoy enable */}
      <Dialog
        open={dialog === "decoy"}
        onOpenChange={(open) => {
          if (!open && !pending) setDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Turn on decoy mode?</DialogTitle>
            <DialogDescription>Off by default. Read this first.</DialogDescription>
          </DialogHeader>
          <p
            style={{
              margin: 0,
              fontSize: "13.5px",
              lineHeight: 1.55,
              color: "var(--muted-foreground)",
            }}
          >
            Decoy mode lets the tool{" "}
            <b style={{ color: "var(--foreground)" }}>suggest publishing a falsehood</b> about
            yourself to mislead an adversary. Truthful options are always shown alongside,
            it&rsquo;s never auto-selected, and you&rsquo;ll confirm again every time before any
            decoy text appears.
          </p>
          <DialogFooter>
            <Button variant="secondary" disabled={pending} onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              className="btn-warn"
              disabled={pending}
              onClick={() => applyConsent("decoy", true, "Decoy-mode")}
            >
              {pending ? "Turning on…" : "Turn on decoy mode"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm — a TYPED confirmation (D5) */}
      <Dialog
        open={dialog === "delete"}
        onOpenChange={(open) => {
          if (!open && !pending) setDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>This is permanent. There is no undo.</DialogDescription>
          </DialogHeader>
          <p
            style={{
              margin: "0 0 var(--space-1)",
              fontSize: "13.5px",
              lineHeight: 1.55,
              color: "var(--muted-foreground)",
            }}
          >
            We&rsquo;ll crypto-shred your key and cascade-delete everything we hold, then remove
            your sign-in and sign you out. We can&rsquo;t recall copies others already made.
          </p>
          <div className="del-confirm">
            <label className="del-confirm-t" htmlFor="delete-phrase">
              Type <b>{DELETE_PHRASE}</b> to confirm:
            </label>
            <input
              id="delete-phrase"
              className="del-confirm-input"
              type="text"
              autoComplete="off"
              value={deleteTyped}
              onChange={(e) => setDeleteTyped(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" disabled={pending} onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              className="btn-danger"
              disabled={deleteTyped.trim().toLowerCase() !== DELETE_PHRASE || pending}
              onClick={confirmDelete}
            >
              {pending ? "Deleting…" : "Permanently delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
