export type HealthResponse = {
  ok: true;
  service: "catalyst";
  status: "healthy";
};

export function getHealth(): HealthResponse {
  return {
    ok: true,
    service: "catalyst",
    status: "healthy",
  };
}
