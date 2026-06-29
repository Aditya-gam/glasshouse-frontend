"use client";

import Link from "next/link";
import { useState } from "react";
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
import { CONNECTED_ACCOUNTS, type ConnectedAccount } from "@/lib/fixtures/account";

import { SafetySection } from "./safety-section";

import "../account.css";

type ConsentKey = "purpose" | "art9";
type Retention = "retain" | "discard";
type AccountDialog = "revoke-purpose" | "revoke-art9" | "decoy" | "delete" | null;

const RETENTION: { key: Retention; label: string }[] = [
  { key: "retain", label: "Retain, encrypted" },
  { key: "discard", label: "Process, then discard" },
];

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

export function AccountScreen() {
  const { lens } = useLens();
  const [consents, setConsents] = useState({ purpose: true, art9: true, decoy: false });
  const [retention, setRetention] = useState<Retention>("retain");
  const [accounts, setAccounts] = useState<ConnectedAccount[]>(CONNECTED_ACCOUNTS);
  const [dialog, setDialog] = useState<AccountDialog>(null);
  const [delAck, setDelAck] = useState(false);

  const setRet = (k: Retention) => {
    setRetention(k);
    toast(k === "retain" ? "Retention: keep encrypted" : "Retention: process, then discard");
  };

  const toggleConsent = (key: ConsentKey) => {
    if (consents[key]) {
      setDialog(`revoke-${key}`);
      return;
    }
    setConsents((c) => ({ ...c, [key]: true }));
    toast("Consent granted");
  };
  const toggleDecoy = () => {
    if (!consents.decoy) {
      setDialog("decoy");
      return;
    }
    setConsents((c) => ({ ...c, decoy: false }));
    toast("Decoy mode turned off");
  };
  const confirmRevoke = (key: ConsentKey) => {
    setConsents((c) => ({ ...c, [key]: false }));
    setDialog(null);
    toast(`${key === "purpose" ? "Purpose" : "Article 9"} consent revoked`);
  };
  const revokeAccount = (id: string) => {
    setAccounts((a) => a.filter((x) => x.id !== id));
    toast("Disconnected — encrypted token cleared");
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
            What you&rsquo;ve agreed to. Revoke anytime — revoking the purpose consent stops all
            processing.
          </p>
          <div className="sec-card">
            <div className="row">
              <span className="row-ic">
                <Icon name="scan" size={18} />
              </span>
              <div className="row-body">
                <div className="row-name">
                  Self-audit purpose{" "}
                  {consents.purpose ? (
                    <span className="status-pill status-on">Granted</span>
                  ) : (
                    <span className="status-pill status-off">Revoked</span>
                  )}
                </div>
                <div className="row-desc">
                  Process your footprint to reveal what others can infer about you.
                </div>
                {consents.purpose && <div className="row-meta">Granted 25 Jun 2026</div>}
              </div>
              <div className="row-action">
                <Switch
                  checked={consents.purpose}
                  onCheckedChange={() => toggleConsent("purpose")}
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
                {consents.art9 && <div className="row-meta">Granted 25 Jun 2026</div>}
              </div>
              <div className="row-action">
                <Switch
                  checked={consents.art9}
                  onCheckedChange={() => toggleConsent("art9")}
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
                  {consents.decoy ? (
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
                  checked={consents.decoy}
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
                    className={"seg-btn" + (retention === r.key ? " seg-btn--active" : "")}
                    role="radio"
                    aria-checked={retention === r.key}
                    onClick={() => setRet(r.key)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <RetentionDesc retention={retention} />
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
            Read-only connections. Revoking clears the encrypted token immediately.
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
                    {a.name} <span className="status-pill status-on">Read-only</span>
                  </div>
                  <div className="row-desc">{a.handle}</div>
                  <div className="row-meta">{a.date}</div>
                </div>
                <div className="row-action">
                  <button
                    type="button"
                    className="link-btn link-btn--danger"
                    onClick={() => revokeAccount(a.id)}
                  >
                    Revoke access
                  </button>
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
              </div>
              <Button
                variant="secondary"
                onClick={() => toast("Preparing your data bundle — we'll email a secure link")}
              >
                <Icon name="download" size={15} /> Download bundle
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
              <Button
                className="btn-danger"
                onClick={() => {
                  setDelAck(false);
                  setDialog("delete");
                }}
              >
                <Icon name="trash-2" size={15} /> Delete account
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Revoke purpose / art9 */}
      <Dialog
        open={dialog === "revoke-purpose" || dialog === "revoke-art9"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === "revoke-art9"
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
            {dialog === "revoke-art9"
              ? "We'll stop processing data that may reveal special categories (like birthplace). Existing findings for those attributes are removed."
              : "This stops all processing immediately. Your audit pauses and we won't run further inference until you grant it again."}
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Keep it
            </Button>
            <Button
              className="btn-warn"
              onClick={() => confirmRevoke(dialog === "revoke-art9" ? "art9" : "purpose")}
            >
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decoy enable */}
      <Dialog
        open={dialog === "decoy"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
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
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              className="btn-warn"
              onClick={() => {
                setConsents((c) => ({ ...c, decoy: true }));
                setDialog(null);
                toast("Decoy mode on — you'll confirm again each use");
              }}
            >
              Turn on decoy mode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog
        open={dialog === "delete"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
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
            We&rsquo;ll crypto-shred your key and cascade-delete everything we hold. We can&rsquo;t
            recall copies others already made.
          </p>
          <div className="del-confirm">
            <Switch
              checked={delAck}
              onCheckedChange={() => setDelAck((v) => !v)}
              aria-label="Acknowledge permanent deletion"
            />
            <span className="del-confirm-t">
              I understand this is permanent and can&rsquo;t recall copies others have already made.
            </span>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              className="btn-danger"
              disabled={!delAck}
              onClick={() => {
                setDialog(null);
                toast("Account scheduled for deletion — your key is being shredded");
              }}
            >
              Permanently delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
