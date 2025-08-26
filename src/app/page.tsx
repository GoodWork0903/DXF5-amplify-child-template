// src/app/page.tsx
'use client';

import '@/utils/amplify-client'; // ensure Amplify is configured
import { useEffect, useState } from 'react';
import { getCurrentUser, signOut } from 'aws-amplify/auth';

export default function HomePage() {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then(user => setUsername(user.username))
      .catch(() => setUsername(null));
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-6">Welcome to Mother App</h1>

      {username ? (
        <div className="space-y-4 text-center">
          <p className="text-lg">Signed in as <b>{username}</b></p>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600"
          >
            Sign out
          </button>
          <div>
            <a href="/dashboard" className="text-blue-600 underline">
              Go to Dashboard
            </a>
          </div>
        </div>
      ) : (
        <a
          href="/sign-in"
          className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
        >
          Sign in
        </a>
      )}
    </main>
  );
}
