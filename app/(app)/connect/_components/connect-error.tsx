import { ErrorState } from "@/components/states/error-state";
import { Icon } from "@/components/ui/icon";

const SOURCE_HINTS = [
  {
    name: "X archive",
    tip: "Upload the original tweets.zip from Settings → Your account → Download an archive — not a screenshot or partial export.",
  },
  {
    name: "Reddit export",
    tip: "Use the .zip from reddit.com/settings/data-request once it's ready.",
  },
  {
    name: "Google Takeout",
    tip: "Export “Location History” and “Photos” and upload the .zip (not individual files).",
  },
  {
    name: "Connecting an account",
    tip: "If you were linking Reddit or Mastodon, the authorization didn't finish — try again and approve read-only access.",
  },
];

export function ConnectError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="connect-error">
      <ErrorState
        title="Couldn't read that export"
        message="We couldn't parse the file — this is almost always the wrong file or a partial download, not a problem on your end. Nothing was imported."
        onRetry={onRetry}
        retryLabel="Choose another file"
        details={
          "file: twitter-archive.zip\nreason: missing data/tweets.js — not a complete X archive"
        }
      />
      <div className="src-hints">
        <div className="src-hints-label">What usually fixes it</div>
        {SOURCE_HINTS.map((h) => (
          <div className="src-hint" key={h.name}>
            <Icon name="info" size={14} />
            <span>
              <b>{h.name}</b> — {h.tip}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
