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

  // Store → URL and action-driven navigation, coalesced per dispatch batch.
  // One flush per microtask: a batch like [setFilters, compare] either pushes the new route
  // *with* the full query, or (no route change) replaces the query in place. Writing the query
  // separately while a push is in flight raced the navigation and left the user on the old
  // page (found in the AI E2E test: "compare B3 and O13a" from /lab stayed on /lab).
  useEffect(() => {
    let scheduled = false;
    let urlDirty = false;
    let lastNavSeq = dashboardStore.getState().navigationRequest?.seq ?? 0;

    const flush = () => {
      scheduled = false;
      const s = dashboardStore.getState();
      const req = s.navigationRequest;
      if (req && req.seq !== lastNavSeq) {
        lastNavSeq = req.seq;
        if (req.route !== window.location.pathname) {
          urlDirty = false;
          router.push(serializeUrl(req.route, toUrlState(s)));
          return;
        }
      }
      if (urlDirty) {
        urlDirty = false;
        void setQuery(toUrlState(s));
      }
    };

    return dashboardStore.subscribe((s, prev) => {
      if (
        s.mode !== prev.mode ||
        s.filters !== prev.filters ||
        s.selection !== prev.selection ||
        s.compareIds !== prev.compareIds
      ) {
        urlDirty = true;
      }
      if ((urlDirty || s.navigationRequest !== prev.navigationRequest) && !scheduled) {
        scheduled = true;
        queueMicrotask(flush);
      }
    });
  }, [router, setQuery]);

  // Router → store (links, back/forward).
  useEffect(() => {
    dashboardStore.getState().syncRoute(pathname);
  }, [pathname]);

  return null;
}
