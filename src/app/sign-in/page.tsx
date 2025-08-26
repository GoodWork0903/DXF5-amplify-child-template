"use client";
import ensureAmplifyConfigured from "../../utils/amplify-client";
import { signInWithRedirect } from "aws-amplify/auth";
import { useEffect } from "react";


ensureAmplifyConfigured();


export default function SignInPage() {
useEffect(() => {
(async () => {
await signInWithRedirect();
})();
}, []);


return (
<main className="flex min-h-screen items-center justify-center">
<p className="text-sm text-neutral-600">Redirecting to sign-in…</p>
</main>
);
}