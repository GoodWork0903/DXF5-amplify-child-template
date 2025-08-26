"use client";


import ensureAmplifyConfigured from "../utils/amplify-client";
import { useEffect, useState } from "react";
import { getCurrentUser, signOut } from "aws-amplify/auth";
import Link from "next/link";


ensureAmplifyConfigured();


export default function Dashboard() {
const [email, setEmail] = useState<string | null>(null);
const [loading, setLoading] = useState(true);


useEffect(() => {
(async () => {
try {
const user = await getCurrentUser();
// Define the expected type for user.signInDetails
type SignInDetails = { loginId?: string };
type AmplifyUser = { signInDetails?: SignInDetails };
const { signInDetails } = user as AmplifyUser;
const loginId = signInDetails?.loginId ?? null;
setEmail(loginId);
} catch {
setEmail(null);
} finally {
setLoading(false);
}
})();
}, []);


if (loading) {
return (
<main className="flex min-h-screen items-center justify-center">
<p className="text-sm text-neutral-600">Loading…</p>
</main>
);
}


}