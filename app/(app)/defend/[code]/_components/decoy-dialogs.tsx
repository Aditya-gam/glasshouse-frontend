"use client";

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

export type DecoyDialog = "optin" | "confirm" | null;

interface DecoyDialogsProps {
  dialog: DecoyDialog;
  backfire: string;
  onClose: () => void;
  onEnable: () => void;
  onConfirm: () => void;
}

/** Decoy gating: a one-time global opt-in, then a per-use confirm — every time. */
export function DecoyDialogs({
  dialog,
  backfire,
  onClose,
  onEnable,
  onConfirm,
}: DecoyDialogsProps) {
  return (
    <>
      <Dialog
        open={dialog === "optin"}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Turn on decoy mode?</DialogTitle>
            <DialogDescription>
              It&rsquo;s off by default. Please read this first.
            </DialogDescription>
          </DialogHeader>
          <div className="decoy-warn">
            <Icon name="triangle-alert" size={18} />
            <div className="decoy-warn-t">
              <b>Decoy mode suggests publishing a falsehood about yourself</b> — a misleading clue
              so an adversary confidently guesses the wrong value.
            </div>
          </div>
          <ul className="decoy-list">
            <li>
              <Icon name="shield-alert" size={15} /> {backfire}
            </li>
            <li>
              <Icon name="check" size={15} /> Truthful options stay available and are never replaced
              or auto-selected.
            </li>
            <li>
              <Icon name="check" size={15} /> You&rsquo;ll confirm again each time before any decoy
              text is shown.
            </li>
          </ul>
          <DialogFooter>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button className="btn-warn" onClick={onEnable}>
              Turn on decoy mode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog === "confirm"}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Show the decoy suggestion?</DialogTitle>
            <DialogDescription>
              Decoy mode is on. This confirmation repeats every time.
            </DialogDescription>
          </DialogHeader>
          <div className="decoy-warn">
            <Icon name="triangle-alert" size={18} />
            <div className="decoy-warn-t">
              <b>This suggests publishing something untrue</b> about where you live. {backfire}
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={onClose}>
              Use a truthful option
            </Button>
            <Button className="btn-warn" onClick={onConfirm}>
              Show decoy suggestion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
