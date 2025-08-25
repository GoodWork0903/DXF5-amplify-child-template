// src/utils/amplify-client.ts
import { Amplify } from 'aws-amplify';

const userPoolId = process.env.NEXT_PUBLIC_USER_POOL_ID!;
const userPoolWebClientId = process.env.NEXT_PUBLIC_WEB_CLIENT_ID!;
// const identityPoolId = process.env.NEXT_PUBLIC_IDENTITY_POOL_ID!;

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId: userPoolWebClientId,
      // identityPoolId,
      signUpVerificationMethod: 'code',
      loginWith: { email: true },
    },
  },
});
