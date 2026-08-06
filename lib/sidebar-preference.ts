export const SIDEBAR_PINNED_COOKIE = {
  name: "sidebar_state",
  maxAge: 60 * 60 * 24 * 7,
} as const;

export function parseSidebarPinnedPreference(value: string | undefined) {
  return value !== "false";
}

export function serializeSidebarPinnedPreference(pinned: boolean) {
  return String(pinned);
}
