import { RacePhoto } from '@/components/RacePhoto'
import { ForgotPasswordForm } from '@/components/PasswordRecoveryForms'
export const metadata = {
  title: 'Odzyskaj hasło — Race Control',
  robots: { index: false, follow: false },
}
export default function ForgotPasswordPage() {
  return (
    <div className="auth-page">
      <div className="auth-art">
        <RacePhoto scene="night" />
      </div>
      <div className="auth-form-area">
        <ForgotPasswordForm />
      </div>
    </div>
  )
}
