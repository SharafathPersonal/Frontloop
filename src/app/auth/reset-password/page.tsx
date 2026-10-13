import { redirect } from 'next/navigation';

/** Old links land here; the code-based reset now lives on one page. */
export default function ResetPasswordPage() {
  redirect('/auth/forgot-password');
}
