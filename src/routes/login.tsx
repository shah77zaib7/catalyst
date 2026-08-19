import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Atmosphere } from "@/components/layout/atmosphere";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user, isPending } = useCurrentUserState();

  if (!isPending && user) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <main className="relative grid min-h-dvh place-items-center px-4 py-10 text-foreground">
      <Atmosphere />
      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Personal market intelligence
          </p>
          <h1 className="font-display text-4xl font-medium tracking-tight text-foreground">CATALYST</h1>
          <p className="text-sm text-muted-foreground">Market intelligence, without the noise.</p>
        </div>

        <Card variant="plate" lift={false}>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Optional. The dashboard is available without an account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {authEnabled ? (
              GROK_PROVIDERS.map((provider) => (
                <Button
                  key={provider.providerId}
                  type="button"
                  variant="glass"
                  className="w-full"
                  onClick={() => void signIn(provider.providerId, { callbackURL: "/dashboard" })}
                >
                  Continue with {provider.label}
                </Button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Sign-in is disabled.</p>
            )}
            <Button asChild variant="ghost" className="w-full">
              <Link to="/dashboard">Continue without signing in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
