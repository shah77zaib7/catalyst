import { Link } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { signOut } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthSlot() {
  const { user, isPending } = useCurrentUserState();

  if (isPending) {
    return <Skeleton className="h-10 w-24 rounded-[var(--radius-control)]" />;
  }

  if (!user) {
    return (
      <Button asChild variant="glass" size="sm" className="min-w-20">
        <Link to="/login">Sign in</Link>
      </Button>
    );
  }

  const label = user.displayName ?? user.primaryEmail ?? "Account";

  return (
    <div className="flex items-center gap-2">
      {user.profileImageUrl ? (
        <img
          src={user.profileImageUrl}
          alt=""
          className="size-8 rounded-full object-cover outline outline-1 -outline-offset-1 outline-foreground/10"
        />
      ) : (
        <span className="grid size-8 place-items-center rounded-full bg-muted text-xs font-medium">
          {label.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="hidden max-w-28 truncate text-sm sm:inline">{label}</span>
      <Button type="button" variant="ghost" size="sm" onClick={() => void signOut("/login")}>
        Sign out
      </Button>
    </div>
  );
}
