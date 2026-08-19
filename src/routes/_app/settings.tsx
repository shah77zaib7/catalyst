import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { SourceStatusPanel } from "@/components/source-status/source-status-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { getIntegrations } from "@/lib/integrations/registry";
import { ASSETS } from "@/types/catalyst";
import { loadMarketIntegration, loadMarketQuotes } from "@/lib/market/load-quotes";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { signOut } from "@/lib/auth/client";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/_app/settings")({
  loader: async () => {
    const quotes = await loadMarketQuotes({ data: { assets: [...ASSETS] } });
    const market = await loadMarketIntegration();
    const latest = quotes
      .map((quote) => quote.timestamp)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1);
    return {
      integrations: getIntegrations({
        sourceStatus: market.sourceStatus,
        detail: market.detail,
        lastUpdated: latest ?? null,
      }),
    };
  },
  component: SettingsPage,
});

const THEME_OPTIONS = [
  { value: "system", label: "System" },
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
] as const;

function SettingsPage() {
  const { preference, setPreference } = useTheme();
  const { user, isPending } = useCurrentUserState();
  const { integrations } = Route.useLoaderData();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Appearance, account, and the current status of every external source."
      />

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Warm ivory is the default reading surface. Dark is available.</CardDescription>
        </CardHeader>
        <CardContent>
          <SegmentedControl
            label="Theme"
            value={preference}
            options={THEME_OPTIONS}
            onChange={setPreference}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Optional sign-in. The product is readable without an account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isPending ? (
            <p className="text-sm text-muted-foreground">Checking session…</p>
          ) : user ? (
            <>
              <p className="text-sm">
                Signed in as{" "}
                <span className="font-medium">{user.displayName ?? user.primaryEmail}</span>
              </p>
              <Button type="button" variant="glass" onClick={() => void signOut("/login")}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">You are not signed in.</p>
              <Button asChild variant="glass">
                <Link to="/login">Sign in</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <SourceStatusPanel items={integrations} />

      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
          <CardDescription>Product contract.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Catalyst informs the trader. It does not trade for the trader.</p>
          <p className="font-medium text-foreground">
            Raw data → deterministic processing → AI interpretation → user
          </p>
          <p>
            Market quotes come from Twelve Data through a server-side adapter. News, calendar,
            notifications, and AI are not connected. Unavailable integrations are labeled
            UNAVAILABLE. Cached quotes are never labeled LIVE.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
