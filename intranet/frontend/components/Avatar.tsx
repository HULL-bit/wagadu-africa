"use client";

interface AvatarUser {
  avatar?: string | null;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
}

function initials(u: AvatarUser | null | undefined): string {
  if (!u) return "?";
  const name = u.full_name || `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.email || "?";
  return name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export function Avatar({ user, size = 40 }: { user: AvatarUser | null | undefined; size?: number }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) };
  if (user?.avatar) {
    return <img src={user.avatar} alt="" className="avatar" style={style} />;
  }
  return <span className="avatar" style={style}>{initials(user)}</span>;
}
