import { OrganisationStructurePage } from '../../organisation/pages/OrganisationStructurePage';

// edited by wali: Route the dedicated Designations page through the shared company scope.
export function DesignationsPage() {
  return <OrganisationStructurePage section="designations" />;
}
