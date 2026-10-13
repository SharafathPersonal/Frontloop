import type { Metadata } from 'next';
import RegisterClient from './register-client';

export const metadata: Metadata = {
  title: 'Create Your Workspace | FrontLoop',
  robots: { index: false },
};

export default function RegisterPage() {
  return <RegisterClient />;
}
