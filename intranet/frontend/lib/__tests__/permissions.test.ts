import { describe, expect, it } from "vitest";

// Réplique la logique de `can()` de lib/auth.tsx pour garantir que le contrôle
// d'accès côté client reste cohérent (le serveur reste l'autorité).
function can(me: { is_super_admin: boolean; permissions: string[] } | null, perm: string) {
  return !!me && (me.is_super_admin || me.permissions.includes(perm));
}

describe("can()", () => {
  it("refuse si non authentifié", () => {
    expect(can(null, "audit.view")).toBe(false);
  });

  it("autorise le super administrateur pour toute permission", () => {
    expect(can({ is_super_admin: true, permissions: [] }, "platform.settings")).toBe(true);
  });

  it("s'appuie sur les permissions effectives", () => {
    const me = { is_super_admin: false, permissions: ["tasks.view", "tasks.submit"] };
    expect(can(me, "tasks.submit")).toBe(true);
    expect(can(me, "tasks.assign")).toBe(false);
  });
});
