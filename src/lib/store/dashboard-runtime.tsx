"use client";

import { usePathname, useRouter } from "next/navigation";
import { useQueryStates } from "nuqs";
import { Suspense, useEffect, useRef } from "react";

import { preferencesStore } from "./preferences";
import { dashboardStore } from "./store";
import { fromUrlState, serializeUrl, toUrlState, urlParsers } from "./url";

/**
 * Side-effect bridge between the store and the browser. Mount once in the root layout:
 *  - hydrates the store from the URL on load (shareable views),
 *  - mirrors mode / filters / selection / compare back into the URL (replace, shallow),
 *  - performs navigations requested by actions (AI "open run O13a" → router.push),
 *  - keeps `route` in sync with the real pathname, rehydrates persisted preferences.
 */
export function DashboardRuntime() {
  return (
    <Suspense fallback={null}>
      <RuntimeEffects />
    </Suspense>
  );
}

function RuntimeEffects() {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useQueryStates(urlParsers, { history: "replace", shallow: true });
  const hydrated = useRef(false);

  // URL → store, once.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    dashboardStore.getState().hydrate(fromUrlState(query));
    void preferencesStore.persist.rehydrate();
  }, [query]);

  // Store → URL.
  useEffect(
    () =>
      dashboardStore.subscribe((s, prev) => {
        if (
          s.mode !== prev.mode ||
          s.filters !== prev.filters ||
          s.selection !== prev.selection ||
          s.compareIds !== prev.compareIds
        ) {
          void setQuery(toUrlState(s));
        }
      }),
    [setQuery],
  );

  // Action-driven navigation, carrying the shareable query along.
  useEffect(
    () =>
      dashboardStore.subscribe((s, prev) => {
        const req = s.navigationRequest;
        if (req && req !== prev.navigationRequest && req.route !== window.location.pathname) {
          router.push(serializeUrl(req.route, toUrlState(s)));
        }
      }),
    [router],
  );

  // Router → store (links, back/forward).
  useEffect(() => {
    dashboardStore.getState().syncRoute(pathname);
  }, [pathname]);

  return null;
}
