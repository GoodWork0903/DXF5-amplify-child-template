export async function GET() {
return Response.json({
status: "ok",
tenantId: process.env.NEXT_PUBLIC_TENANT_ID,
appName: process.env.NEXT_PUBLIC_APP_NAME,
region: process.env.NEXT_PUBLIC_REGION,
});
}