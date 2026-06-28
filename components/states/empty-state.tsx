import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/lib/icons";

import "./states.css";

interface EmptyStateProps {
  title: string;
  icon?: IconName;
  message?: string;
  message2?: string;
  /** Optional CTA rendered as a link (keeps the component server-renderable). */
  action?: string;
  actionHref?: string;
}

/** Calm "no data here" state (never alarmist). `role="status"` announces politely. */
export function EmptyState({
  icon = "inbox",
  title,
  message,
  message2,
  action,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="state state--empty" role="status">
      <div className="state-ic">
        <Icon name={icon} size={26} />
      </div>
      <h3 className="state-title">{title}</h3>
      {message && <p className="state-msg">{message}</p>}
      {message2 && <p className="state-msg2">{message2}</p>}
      {action && actionHref && (
        <div className="state-actions">
          <Link href={actionHref} className={buttonVariants()}>
            {action}
          </Link>
        </div>
      )}
    </div>
  );
}
