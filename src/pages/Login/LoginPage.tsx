import { LoginForm } from "../../features/auth/ui/LoginForm";
import type { UserRole } from "../../shared/types";

interface Props {
  onLogin: (role: UserRole, agenceId: string | null) => void;
}

export const LoginPage = ({ onLogin }: Props) => {
  return <LoginForm onLogin={onLogin} />;
};
