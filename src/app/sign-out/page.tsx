'use client';
import '@/utils/amplify-client';

import { useEffect } from 'react';
import { signOut } from 'aws-amplify/auth';


export default function SignOutPage() {
  useEffect(() => {
    (async () => {
      await signOut();
      // Hosted UI will also redirect to redirectSignOut (origin); this is a safety.
      window.location.assign('/');
    })();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-neutral-600">Signing out…</p>
    </main>
  );
}
