import type { AdminTab, View } from "./types";

/**
 * The `View` union is what the app switches on; this is only the translation
 * to and from a URL, so a page can be refreshed, linked and gone back from.
 * Every view has a path and every path parses back to the same view. Anything
 * unrecognised lands on the picks page rather than showing nothing.
 */

const ADMIN_TABS: AdminTab[] = ["users", "organizations", "games"];

function idOf(raw: string | undefined): number | null {
  if (!raw) return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function pathOf(view: View): string {
  switch (view.name) {
    case "picks":
      return "/";
    case "org":
      return view.tab === "picks" ? `/orgs/${view.orgId}/picks` : `/orgs/${view.orgId}`;
    case "account":
      return "/account";
    case "rules":
      return "/rules";
    case "admin":
      return view.tab === "users" ? "/admin" : `/admin/${view.tab}`;
  }
}

export function viewOf(pathname: string): View {
  const [, head = "", second = "", third = ""] = pathname.split("/");

  switch (head) {
    case "orgs": {
      const orgId = idOf(second);
      return orgId === null ? { name: "picks" } : { name: "org", orgId, tab: third === "picks" ? "picks" : "standings" };
    }
    case "account":
      return { name: "account" };
    case "rules":
      return { name: "rules" };
    case "admin":
      return { name: "admin", tab: (ADMIN_TABS as string[]).includes(second) ? (second as AdminTab) : "users" };
    default:
      return { name: "picks" };
  }
}

export const currentView = (): View => viewOf(window.location.pathname);
