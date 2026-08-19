import { createFileRoute } from "@tanstack/react-router";
import { getHealth } from "@/lib/api/health";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: () => Response.json(getHealth()),
    },
  },
});
