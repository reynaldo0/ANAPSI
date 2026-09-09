export const dynamic = "force-dynamic";

export async function GET() {
  const databaseConfigured = Boolean(process.env.DATABASE_URL);
  const authConfigured = Boolean(process.env.AUTH_SECRET);

  return Response.json({
    ok: true,
    data: {
      service: "blindspot-api",
      status: "healthy",
      database: databaseConfigured ? "configured" : "not-configured",
      auth: authConfigured ? "configured" : "not-configured",
    },
  });
}