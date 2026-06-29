/**
 * Centered shell for Clerk's hosted <SignIn /> / <SignUp /> components.
 * Standalone (no app Topbar/lens) — this is the unauthenticated entry point.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-dvh items-center justify-center bg-background p-6"
    >
      {children}
    </main>
  );
}
