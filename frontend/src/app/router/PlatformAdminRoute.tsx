// edited by wali: Restrict platform-wide plan management to platform administrators.
import {Navigate,Outlet} from "react-router-dom";
import {usePermissions} from "../../hooks/usePermissions";
export function PlatformAdminRoute(){const {isPlatformAdmin}=usePermissions();return isPlatformAdmin?<Outlet/>:<Navigate to="/unauthorized" replace/>;}
