// src/app/sign-in/layout.tsx
export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // no <html> or <body> here; root layout already provides them
  return <>{children}</>;
}
