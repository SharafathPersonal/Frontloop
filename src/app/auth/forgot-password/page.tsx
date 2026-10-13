import type { Metadata } from 'next';
import ForgotPasswordClient from './forgot-password-client';

export const metadata: Metadata = {
  title: 'Password Recovery | FrontLoop',
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
