import { NextResponse } from 'next/server';

export async function GET() {
  const payload = {
    status: 'ok',
    tenantId: process.env.NEXT_PUBLIC_TENANT_ID ?? null,
    appName: process.env.NEXT_PUBLIC_APP_NAME ?? null,
    subdomain: process.env.NEXT_PUBLIC_SUBDOMAIN ?? null,
    version: process.env.VERCEL_GIT_COMMIT_SHA || process.env.AMPLIFY_BRANCH || 'dev',
    region: process.env.NEXT_PUBLIC_REGION,
  };
  return NextResponse.json(payload);
}
