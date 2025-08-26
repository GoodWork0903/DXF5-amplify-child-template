"use client";


import { Amplify } from "aws-amplify";


let configured = false;


export default function ensureAmplifyConfigured() {
if (configured) return;


const region = process.env.NEXT_PUBLIC_REGION;
const userPoolId = process.env.NEXT_PUBLIC_USER_POOL_ID;
const userPoolClientId = process.env.NEXT_PUBLIC_APP_CLIENT_ID;
const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN; // no protocol


if (!region || !userPoolId || !userPoolClientId || !domain) {
console.warn("[Amplify] Missing env vars. Check NEXT_PUBLIC_* settings.");
configured = true;
return;
}


// Use the deployed origin for Hosted UI redirects
const origin = typeof window !== "undefined" ? window.location.origin : "";


Amplify.configure({
Auth: {
Cognito: {
// region,
userPoolId,
userPoolClientId,
loginWith: {
oauth: {
domain, // e.g. your-pool-domain.auth.us-east-1.amazoncognito.com
scopes: ["openid", "email", "profile"],
redirectSignIn: [origin ? `${origin}/` : "/"],
redirectSignOut: [origin ? `${origin}/` : "/"],
responseType: "code",
},
},
},
},
});


configured = true;
}