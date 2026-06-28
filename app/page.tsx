export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 px-6 py-24">
      <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
        Glasshouse
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-balance">
        See your privacy exposure the way an adversary would.
      </h1>
      <p className="text-muted-foreground text-pretty">
        Attack &rarr; Measure &rarr; Defend. This is the frontend scaffold (R2). The seven product
        screens arrive in M5.5, synced from the prototype and running on mocked data until the
        backend client lands in M5.4.
      </p>
    </main>
  );
}
