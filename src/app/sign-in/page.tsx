'use client';

import '@/utils/amplify-client';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

function RedirectOnAuth() {
  const router = useRouter();
  const { authStatus } = useAuthenticator();

  useEffect(() => {
    if (authStatus === 'authenticated') {
      const next = new URLSearchParams(window.location.search).get('next') || '/dashboard';
      router.replace(next);
    }
  }, [authStatus, router]);

  return null; // no UI, just redirects when signed in
}

export default function LoginPage() {
  return (
      <Authenticator
        signUpAttributes={['address', 'birthdate', 'email', 'name']}
        formFields={{
          signUp: {
            name: { label: 'Full name', placeholder: 'Jane Doe', isRequired: true, order: 1 },
            birthdate: { label: 'Birth date', placeholder: 'YYYY-MM-DD', order: 2 },
            email: { order: 3 },
            address: { label: 'Address', placeholder: 'Street, City, State/Region, Country', isRequired: true, order: 4 },
          },
        }}
      >
        <RedirectOnAuth />
      </Authenticator>
  );
}
