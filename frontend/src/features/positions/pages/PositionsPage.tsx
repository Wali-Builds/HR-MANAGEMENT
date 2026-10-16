import { OrganisationStructurePage } from '../../organisation/pages/OrganisationStructurePage';

// edited by wali: Route the dedicated Positions page through the shared company scope.
export function PositionsPage() {
  return <OrganisationStructurePage section="positions" />;
}
