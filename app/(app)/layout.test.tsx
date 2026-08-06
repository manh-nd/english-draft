import { describe, expect, mock, test } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const getSession = mock(async () => ({
  user: {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    image: null,
  },
}));

mock.module("@/lib/auth", () => ({
  auth: { api: { getSession } },
}));

mock.module("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: () => undefined }),
}));

mock.module("next/navigation", () => ({
  redirect: () => {
    throw new Error("Unexpected redirect");
  },
  usePathname: () => "/",
  useRouter: () => ({
    push: mock(() => {}),
    replace: mock(() => {}),
    refresh: mock(() => {}),
  }),
}));

mock.module("next-themes", () => ({
  useTheme: () => ({ theme: undefined, setTheme: mock(() => {}) }),
}));

import AppLayout from "./layout";

describe("App layout sidebar composition", () => {
  test("renders the desktop hover activation rail", async () => {
    const layout = await AppLayout({ children: <p>Document</p> });
    const markup = renderToStaticMarkup(layout);

    expect(markup).toContain('data-slot="sidebar-rail"');
    expect(markup).toContain('aria-label="Unpin and collapse sidebar"');
  });
});
