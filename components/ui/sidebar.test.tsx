import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import React from "react";

import {
  Sidebar,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "./sidebar";

function DesktopSidebar({ page = "documents" }: { page?: string }) {
  return (
    <SidebarProvider defaultPinned={false}>
      <Sidebar>
        <span>Navigation</span>
        <SidebarRail />
      </Sidebar>
      <SidebarTrigger />
      <span>{page}</span>
    </SidebarProvider>
  );
}

function getDesktopSidebar() {
  return document.querySelector<HTMLElement>(
    '[data-slot="sidebar"][data-state]'
  );
}

function getSidebarRail() {
  return document.querySelector<HTMLButtonElement>(
    '[data-slot="sidebar-rail"]'
  ) as HTMLButtonElement;
}

describe("Sidebar desktop visibility and pinning", () => {
  beforeEach(() => {
    window.innerWidth = 1024;
    document.cookie = "sidebar_state=; path=/; max-age=0";
  });

  afterEach(cleanup);

  test("a collapsed sidebar opens only while its activation area is hovered", async () => {
    render(<DesktopSidebar />);

    await waitFor(() => expect(getDesktopSidebar()).not.toBeNull());
    const sidebar = getDesktopSidebar();
    const rail = getSidebarRail();

    expect(sidebar?.dataset.state).toBe("collapsed");
    fireEvent.pointerEnter(rail);
    expect(sidebar?.dataset.state).toBe("hover-open");

    fireEvent.pointerLeave(sidebar as HTMLElement);
    expect(sidebar?.dataset.state).toBe("collapsed");
  });

  test("pinning survives hover exit and navigation, then unpinning collapses", async () => {
    const view = render(<DesktopSidebar page="documents" />);

    await waitFor(() => expect(getDesktopSidebar()).not.toBeNull());
    const sidebar = getDesktopSidebar() as HTMLElement;
    const rail = getSidebarRail();

    fireEvent.pointerEnter(rail);
    fireEvent.click(rail);
    expect(sidebar.dataset.state).toBe("pinned-open");
    expect(rail.getAttribute("aria-pressed")).toBe("true");

    fireEvent.pointerLeave(sidebar);
    view.rerender(<DesktopSidebar page="review" />);
    expect(getDesktopSidebar()?.dataset.state).toBe("pinned-open");
    expect(screen.getByText("review")).toBeTruthy();

    fireEvent.click(getSidebarRail());
    expect(getDesktopSidebar()?.dataset.state).toBe("collapsed");
    expect(document.cookie).toContain("sidebar_state=false");
  });

  test("the pinned preference can seed a remounted provider", async () => {
    const firstMount = render(<DesktopSidebar />);

    await waitFor(() => expect(getDesktopSidebar()).not.toBeNull());
    fireEvent.click(getSidebarRail());
    expect(document.cookie).toContain("sidebar_state=true");
    firstMount.unmount();

    render(
      <SidebarProvider
        defaultPinned={document.cookie.includes("sidebar_state=true")}
      >
        <Sidebar>
          <span>Navigation after reload</span>
        </Sidebar>
      </SidebarProvider>
    );

    await waitFor(() =>
      expect(getDesktopSidebar()?.dataset.state).toBe("pinned-open")
    );
  });

  test("the keyboard shortcut exposes and changes the pinned state", async () => {
    render(<DesktopSidebar />);

    await waitFor(() => expect(getDesktopSidebar()).not.toBeNull());
    const trigger = screen.getAllByRole("button", {
      name: "Pin sidebar open",
    })[1];
    expect(trigger.getAttribute("aria-pressed")).toBe("false");

    fireEvent.keyDown(window, { key: "b", ctrlKey: true });

    expect(getDesktopSidebar()?.dataset.state).toBe("pinned-open");
    expect(
      screen
        .getAllByRole("button", {
          name: "Unpin and collapse sidebar",
        })[1]
        .getAttribute("aria-pressed")
    ).toBe("true");
  });
});

describe("Sidebar mobile behavior", () => {
  beforeEach(() => {
    window.innerWidth = 375;
  });

  afterEach(cleanup);

  test("mobile opens by activation and does not depend on hover", async () => {
    render(
      <SidebarProvider defaultPinned={false}>
        <Sidebar>
          <span>Mobile navigation</span>
        </Sidebar>
        <SidebarTrigger />
      </SidebarProvider>
    );

    const trigger = await screen.findByRole("button", {
      name: "Open sidebar",
    });
    fireEvent.pointerEnter(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(trigger);
    expect(
      document
        .querySelector('[data-slot="sidebar-trigger"]')
        ?.getAttribute("aria-label")
    ).toBe("Close sidebar");
    expect(
      document
        .querySelector('[data-slot="sidebar-trigger"]')
        ?.getAttribute("aria-expanded")
    ).toBe("true");
  });
});
