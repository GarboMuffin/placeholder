import { validateAdminPermissions } from "$lib/server/utils";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({cookies}) => {
  const adminToken = cookies.get('adminToken');
  validateAdminPermissions(adminToken);
};
