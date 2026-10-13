import { Suspense } from 'react'
import { RacePhoto } from '@/components/RacePhoto'
import { ResetPasswordForm } from '@/components/PasswordRecoveryForms'
export const metadata = {
  title: 'Nowe hasło — Race Control',
  robots: { index: false, follow: false },
}
export default function ResetPasswordPage() {
  return (
    <div className="auth-page">
      <div className="auth-art">
        <RacePhoto scene="night" />
      </div>
      <div className="auth-form-area">
        <Suspense fallback={<p role="status">Wczytywanie formularza…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
