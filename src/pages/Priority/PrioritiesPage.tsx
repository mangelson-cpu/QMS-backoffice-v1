import React from "react";
import { PriorityManager } from "../../features/priority/ui/PriorityManager";
import type { UserRole } from "../../shared/types";

interface Props {
  userRole: UserRole;
  currentUserAgenceId: string | null;
}

export const PrioritiesPage: React.FC<Props> = ({ userRole, currentUserAgenceId }) => {
  return (
    <PriorityManager
      userRole={userRole}
      currentUserAgenceId={currentUserAgenceId}
    />
  );
};
