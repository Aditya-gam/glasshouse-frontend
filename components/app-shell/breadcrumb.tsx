import Link from "next/link";
import { Fragment } from "react";

import { Icon } from "@/components/ui/icon";

import "./breadcrumb.css";

export interface Crumb {
  label: string;
  href?: string;
}

/** Breadcrumb for the Topbar center slot on detail screens. The last item (no href)
 *  is the current page. */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      {items.map((c, i) => (
        <Fragment key={c.label}>
          {i > 0 && <Icon name="chevron-right" size={14} />}
          {c.href ? (
            <Link href={c.href}>{c.label}</Link>
          ) : (
            <span className="crumb-here" aria-current="page">
              {c.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
