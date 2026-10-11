import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DetectOutcome } from "@/lib/extract/detect";
import { axe } from "@/test/axe";

import type { ImportSummaryResult, RunStatusResult } from "../actions";

const { extractAnyExport, ingestionStatusAction, importSummaryAction } = vi.hoisted(() => ({
  extractAnyExport: vi.fn<(archive: Blob) => Promise<DetectOutcome>>(),
  ingestionStatusAction: vi.fn<(input: unknown) => Promise<RunStatusResult>>(),
  importSummaryAction: vi.fn<(input: unknown) => Promise<ImportSummaryResult>>(),
}));

const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }));
vi.mock("sonner", () => ({ toast: Object.assign(toastMock, { error: vi.fn() }) }));
vi.mock("@/components/app-shell/topbar", () => ({ Topbar: () => null }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock("@/lib/extract/detect", () => ({ extractAnyExport }));
vi.mock("../actions", () => ({ ingestionStatusAction, importSummaryAction }));

import { ConnectScreen } from "./connect-screen";

const RUN_ID = "11111111-1111-4111-8111-111111111111";
const ZIP = new File([new Uint8Array(64)], "export.zip", { type: "application/zip" });

const EXTRACT_OK: DetectOutcome = {
  ok: true,
  platform: "reddit",
  files: [{ name: "comments.csv", data: new Blob(["id\n"]), bytes: 3 }],
  totalBytes: 3,
};

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  extractAnyExport.mockResolvedValue(EXTRACT_OK);
  ingestionStatusAction.mockResolvedValue({ ok: true, status: "succeeded" });
  importSummaryAction.mockResolvedValue({ ok: true, kept: 42, dropped: 7 });
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ run_id: RUN_ID, status: "queued" }), { status: 202 }),
  );
});

function renderScreen(live = true, maxPolls?: number) {
  return render(<ConnectScreen live={live} ingestPollMs={20} ingestMaxPolls={maxPolls} />);
}

async function uploadFile(user: ReturnType<typeof userEvent.setup>) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  await user.upload(input, ZIP);
}

// Rendering ConnectScreen transitively covers source-card, connect-error, import-run.
describe("ConnectScreen — live upload path", () => {
  it("extracts in-browser, uploads ONLY the extracted members, and shows kept-vs-dropped", async () => {
    const user = userEvent.setup();
    renderScreen();
    await uploadFile(user);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/imports");
    const body = init?.body as FormData;
    expect(body.get("platform")).toBe("reddit");
    expect(body.getAll("files")).toHaveLength(1);
    expect((init?.headers as Record<string, string>)["Idempotency-Key"]).toBeTruthy();

    expect(await screen.findByText("What we imported")).toBeInTheDocument();
    expect(screen.getAllByText("Reddit export").length).toBeGreaterThan(1); // the chip joins the format button
    expect(screen.getByText("42")).toBeInTheDocument(); // kept
    expect(screen.getByText("7")).toBeInTheDocument(); // dropped
    expect(importSummaryAction).toHaveBeenCalledWith({ runId: RUN_ID });
  });

  it("renders the extraction module's user-facing error without uploading anything", async () => {
    extractAnyExport.mockResolvedValueOnce({
      ok: false,
      code: "over_cap",
      message: "The files to upload come to 51.0 MB, above the 50.0 MB limit.",
    });
    const user = userEvent.setup();
    renderScreen();
    await uploadFile(user);

    expect(await screen.findByText(/above the 50.0 MB limit/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("501 (stub era): falls back to the demo simulation, never a fake live import", async () => {
    fetchMock.mockResolvedValueOnce(new Response("not implemented", { status: 501 }));
    const user = userEvent.setup();
    renderScreen();
    await uploadFile(user);

    // The fixture sim runs and lands in the imported summary with fixture counts.
    await waitFor(() => expect(screen.getByText(/What we imported/)).toBeInTheDocument(), {
      timeout: 5000,
    });
    expect(ingestionStatusAction).not.toHaveBeenCalled();
  });

  it("cancel during upload actually cancels — nothing resurrects afterwards", async () => {
    let abortSignal: AbortSignal | undefined;
    fetchMock.mockImplementationOnce(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          abortSignal = init?.signal ?? undefined;
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    const user = userEvent.setup();
    renderScreen();
    await uploadFile(user);

    const cancel = await screen.findByRole("button", { name: /Cancel/ });
    await user.click(cancel);

    expect(abortSignal?.aborted).toBe(true);
    // The pipeline never resurrects: no progress panel, no error, no summary.
    await new Promise((r) => setTimeout(r, 120));
    expect(screen.queryByText(/Importing/)).not.toBeInTheDocument();
    expect(screen.queryByText(/What we imported/)).not.toBeInTheDocument();
    expect(ingestionStatusAction).not.toHaveBeenCalled();
  });

  it("a TERMINAL poll failure (404) errors immediately instead of grinding to the cap", async () => {
    ingestionStatusAction.mockResolvedValue({ ok: false, terminal: true });
    const user = userEvent.setup();
    renderScreen();
    await uploadFile(user);

    expect(await screen.findByText("We lost track of the import")).toBeInTheDocument();
    expect(ingestionStatusAction).toHaveBeenCalledTimes(1);
  });

  it("a transient summary failure keeps polling instead of erroring a SUCCEEDED run", async () => {
    importSummaryAction
      .mockResolvedValueOnce({ ok: false }) // counts lag the run row by a beat
      .mockResolvedValueOnce({ ok: true, kept: 5, dropped: 1 });
    const user = userEvent.setup();
    renderScreen();
    await uploadFile(user);

    expect(await screen.findByText("What we imported")).toBeInTheDocument();
    expect(importSummaryAction).toHaveBeenCalledTimes(2);
  });

  it("the poll cap lands on the taking-too-long error, not an infinite spinner", async () => {
    ingestionStatusAction.mockResolvedValue({ ok: true, status: "running" });
    const user = userEvent.setup();
    renderScreen(true, 2);
    await uploadFile(user);

    expect(await screen.findByText("The import is taking too long")).toBeInTheDocument();
  });

  it("a 202 without a run id never claims nothing was imported", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 202 }));
    const user = userEvent.setup();
    renderScreen();
    await uploadFile(user);

    expect(await screen.findByText(/Upload accepted, but we lost track/)).toBeInTheDocument();
    expect(screen.getByText(/will be processed/)).toBeInTheDocument();
    expect(screen.queryByText(/nothing was imported/i)).not.toBeInTheDocument();
  });

  it("a failed ingestion run is reported — nothing claimed as kept", async () => {
    ingestionStatusAction.mockResolvedValue({ ok: true, status: "failed" });
    const user = userEvent.setup();
    renderScreen();
    await uploadFile(user);

    expect(await screen.findByText("The import failed")).toBeInTheDocument();
    expect(screen.queryByText(/What we imported/)).not.toBeInTheDocument();
  });

  it("nothing kept: a real state, not a silent success", async () => {
    importSummaryAction.mockResolvedValue({ ok: true, kept: 0, dropped: 12 });
    const user = userEvent.setup();
    renderScreen();
    await uploadFile(user);

    expect(await screen.findByText("Nothing of yours to keep")).toBeInTheDocument();
    expect(screen.getByText(/Nothing was stored/)).toBeInTheDocument();
  });

  it("over-cap refusal from the server (413) is reported honestly", async () => {
    fetchMock.mockResolvedValueOnce(new Response("too large", { status: 413 }));
    const user = userEvent.setup();
    renderScreen();
    await uploadFile(user);

    expect(await screen.findByText(/over the size limit/)).toBeInTheDocument();
  });
});

describe("ConnectScreen — demo mode (no backend)", () => {
  it("extracts for REAL but never uploads — the sim runs, labeled demo everywhere", async () => {
    const user = userEvent.setup();
    renderScreen(false);
    await uploadFile(user);

    await waitFor(() => expect(screen.getByText(/What we imported/)).toBeInTheDocument(), {
      timeout: 5000,
    });
    expect(extractAnyExport).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    // Honest labeling: the toast AND the persistent summary both say demo.
    expect(toastMock).toHaveBeenCalledWith(expect.stringContaining("(demo — nothing stored)"));
    expect(screen.getByText(/Counts include demo entries/)).toBeInTheDocument();
    expect(screen.getByText(/· demo/)).toBeInTheDocument();
  });

  it("a second demo upload of the same platform is NOT silently swallowed", async () => {
    const user = userEvent.setup();
    renderScreen(false);
    await uploadFile(user);
    await waitFor(() => expect(screen.getByText(/What we imported/)).toBeInTheDocument(), {
      timeout: 5000,
    });

    await uploadFile(user);
    await waitFor(() => expect(screen.getAllByText(/· demo/).length).toBeGreaterThanOrEqual(2), {
      timeout: 5000,
    });
  });

  it("a bad file still gets the real extraction error in demo mode", async () => {
    extractAnyExport.mockResolvedValueOnce({
      ok: false,
      code: "corrupt_zip",
      message: "The archive couldn't be read — it may be incomplete or damaged.",
    });
    const user = userEvent.setup();
    renderScreen(false);
    await uploadFile(user);

    expect(await screen.findByText(/couldn't be read/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("ConnectScreen — fixture simulations stay honest", () => {
  it("an OAuth sim completion is labeled demo (connectors land in M6)", async () => {
    const user = userEvent.setup();
    renderScreen();
    const reddit = screen.getAllByRole("button", { name: /^Connect$/ })[0];
    await user.click(reddit);
    await waitFor(() => expect(screen.getByText(/What we imported/)).toBeInTheDocument(), {
      timeout: 5000,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("has no a11y violations (idle, error, and nothing-kept states)", async () => {
    const user = userEvent.setup();
    const idle = renderScreen();
    expect((await axe(idle.container)).violations).toEqual([]);
    idle.unmount();

    extractAnyExport.mockResolvedValueOnce({
      ok: false,
      code: "corrupt_zip",
      message: "The archive couldn't be read.",
    });
    const errored = renderScreen();
    await uploadFile(user);
    await screen.findByText(/couldn't be read/);
    expect((await axe(errored.container)).violations).toEqual([]);
    errored.unmount();

    importSummaryAction.mockResolvedValue({ ok: true, kept: 0, dropped: 3 });
    const nothing = renderScreen();
    await uploadFile(user);
    await screen.findByText("Nothing of yours to keep");
    expect((await axe(nothing.container)).violations).toEqual([]);
  });
});
