// Where each role lands after sign-in.
export function homePathForRoles(roles: string[] | null | undefined): string {
  const r = roles ?? [];
  if (r.includes("instructor")) return "/studio";
  if (r.includes("learner")) return "/learn";
  if (r.includes("guardian")) return "/guardian";
  return "/studio";
}
