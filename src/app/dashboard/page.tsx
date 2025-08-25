'use client';

import '@/utils/amplify-client';
import '@aws-amplify/ui-react/styles.css';
import { Authenticator } from '@aws-amplify/ui-react';

export default function DashboardPage() {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID;
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Child App';
  const subdomain = process.env.NEXT_PUBLIC_SUBDOMAIN;

  return (
    <main className="p-6">
      <Authenticator>
        {({ signOut, user }) => (
          <div className="max-w-xl space-y-4">
            <h1 className="text-2xl font-bold">{appName}</h1>
            <p className="text-sm text-neutral-700">
              Signed in as <strong>{user?.signInDetails?.loginId}</strong>
            </p>
            <div className="rounded-xl border p-4">
              <p className="font-medium">Hello, tenant!</p>
              <ul className="mt-2 text-sm text-neutral-700">
                <li>Tenant ID: {tenantId}</li>
                <li>Subdomain: {subdomain}</li>
              </ul>
            </div>
            <button
              onClick={signOut}
              className="rounded-lg border px-3 py-1 text-sm hover:bg-neutral-50"
            >
              Sign out
            </button>
          </div>
        )}
      </Authenticator>
    </main>
  );
}
