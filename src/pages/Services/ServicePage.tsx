import { ServiceManager } from "../../features/service/ui/ServiceManager";
import { GuichetAssignment } from "../../features/guichet/ui/GuichetAssignment";
import type { UserRole } from "../../shared/types";

interface Props {
  userRole: UserRole;
  currentUserAgenceId: string | null;
}

export const ServicePage = ({ userRole, currentUserAgenceId }: Props) => {
  if (userRole === "super_admin") {
    return (
      <ServiceManager 
        key="global" 
        userRole={userRole} 
      />
    );
  }

  return (
    <GuichetAssignment
      key={currentUserAgenceId || "no-agency"}
      userRole={userRole}
      currentUserAgenceId={currentUserAgenceId}
    />
  );
};
