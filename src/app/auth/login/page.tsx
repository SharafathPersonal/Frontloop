import type { Metadata } from 'next';
import LoginClient from './login-client';

export const metadata: Metadata = {
  title: 'Sign In | FrontLoop',
  robots: { index: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string | string[]; next?: string | string[]; reset?: string | string[] }>;
}) {
  const params = await searchParams;
  // `next` is the pre-OTP name of the parameter; old bookmarks still work.
  const requested = params.redirect ?? params.next;
  return (
    <LoginClient
      requestedRedirect={typeof requested === 'string' ? requested : null}
      passwordReset={params.reset === '1'}
    />
  );
}
