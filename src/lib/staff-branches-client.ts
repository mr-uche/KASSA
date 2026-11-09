import { inventoryFetch, getInventoryContext, kassaPost } from "@/lib/inventory-client";

export type StaffRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  roleId: string | null;
  branchId: string | null;
  branch: string;
  status: "Active" | "Pending" | "Expired";
};
export type BranchRecord = {
  id: string; name: string; code: string | null;
  address: string | null; city: string | null; state: string | null;
  phone: string | null; location: string; staffCount: number;
  status: "Active" | "Inactive";
  createdAt: string; lastActivity: string | null;
};
export type RoleRecord = {
  id: string; name: string; description: string; staff: number;
  isSystem: boolean; permissions: string[]; access: string;
};
export type StaffSummary = {
  staff: StaffRecord[];
  branches: BranchRecord[];
  roles: RoleRecord[];
};
export type InvitationPreview = {
  businessName: string; fullName: string; email: string;
  branchName: string; roleName: string; message: string | null;
  expiresAt: string;
};

export async function staffContext() {
  const context = await getInventoryContext();
  return { businessId: context.businessId, branchName: context.branchName, myRole: context.myRole };
}
export function getStaffSummary(businessId: string) {
  return inventoryFetch<StaffSummary>(
    "/api/staff-branches/summary?" + new URLSearchParams({ businessId }),
  );
}
export function createBranch(payload: {
  businessId: string; name: string; code: string; phone: string;
  address: string; city: string; state: string; isActive: boolean;
}) {
  return kassaPost("/api/staff-branches/branches", payload);
}
export function createRole(payload: {
  businessId: string; name: string; description: string; permissions: string[];
}) {
  return kassaPost("/api/staff-branches/roles", payload);
}
export function createInvitation(payload: {
  businessId: string; fullName: string; email: string;
  roleId: string; branchId: string; message: string;
}) {
  return kassaPost<{ id: string; expiresAt: string; token: string; delivery: "COPY_LINK_ONLY" }>(
    "/api/staff-branches/invitations", payload,
  );
}
export function revokeInvitation(businessId: string, invitationId: string) {
  return kassaPost("/api/staff-branches/invitations/" + encodeURIComponent(invitationId) + "/revoke", {
    businessId,
  });
}
export async function updateStaff(
  businessId: string, memberId: string, roleId: string, branchId: string,
) {
  let response: Response;
  try {
    response = await fetch("/api/staff-branches/members/" + encodeURIComponent(memberId), {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      credentials: "same-origin", body: JSON.stringify({ businessId, roleId, branchId }),
    });
  } catch { throw new Error("Cannot reach Kassa. Check your connection."); }
  const body: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body && typeof body === "object" && "message" in body
      ? (body as { message: unknown }).message : null;
    throw new Error(typeof message === "string" ? message :
      Array.isArray(message) ? message.join(". ") : "Unable to update staff assignment");
  }
  return body;
}
export function previewInvitation(token: string) {
  return inventoryFetch<InvitationPreview>(
    "/api/staff-branches/invitations/preview?" + new URLSearchParams({ token }),
  );
}
export function acceptInvitation(token: string) {
  return kassaPost("/api/staff-branches/invitations/accept", { token });
}
export function registerInvited(token: string, password: string) {
  return kassaPost("/api/auth/register-invite", { token, password });
}

export async function staffPatch(path: string, body: Record<string, unknown>) {
  let response: Response;
  try {
    response = await fetch("/api/staff-branches/" + path, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      credentials: "same-origin", body: JSON.stringify(body),
    });
  } catch { throw new Error("Cannot reach Kassa. Check the connection."); }
  const result: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = result && typeof result === "object" && "message" in result
      ? (result as { message: unknown }).message : null;
    throw new Error(typeof message === "string" ? message :
      Array.isArray(message) ? message.join(". ") : "Could not save changes");
  }
  return result;
}
