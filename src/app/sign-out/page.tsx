"use client";
import ensureAmplifyConfigured from "../../utils/amplify-client";
import { signOut } from "aws-amplify/auth";
import { useEffect } from "react";


ensureAmplifyConfigured();


export default function SignOutPage() {
useEffect(() => {
(async () => {
await signOut();
// After Hosted UI sign-out, Cognito will redirect to redirectSignOut (origin)
// We also navigate to home just in case
window.location.assign("/");
})();
}, []);


return (
<main className="flex min-h-screen items-center justify-center">
<p className="text-sm text-neutral-600">Signing out…</p>
</main>
);
}