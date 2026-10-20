import {
  type DehydratedState,
  HydrationBoundary,
  isServer,
  QueryClient,
  QueryClientProvider,
  type UseMutationOptions,
} from "@tanstack/react-query";
import type { AnyRoute, RouteArgs, RouteCaller, RouteFailure, RouteInput, RouteOutput } from "endpoint-kit";
import { routeKeyPrefix } from "endpoint-kit/tanstack-query";
import { lazy, type ReactNode, Suspense, useMemo, useState } from "react";
import { useMatches } from "react-router";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data rendered on the server stays fresh for a minute, so hydration does not refetch it
        // straight away and clientLoaders reuse the cache when navigating back.
        staleTime: 60_000,
        // Retry transport failures only: HTTP errors (404, 409...) are answers, not glitches.
        retry: (failureCount, error) =>
          failureCount < 2 && "_tag" in error && (error._tag === "NetworkError" || error._tag === "TimeoutError"),
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * A new client per request on the server (never share cached data between users), one client
 * for the whole session in the browser. Use it in `clientLoader`s; loaders use `makeQueryClient()`.
 */
export function getQueryClient() {
  if (isServer) return makeQueryClient();
  return (browserQueryClient ??= makeQueryClient());
}

/**
 * Provides the query client and hydrates the `dehydratedState` returned by any matched loader,
 * so a page's loader prefetches with `serverApi` and its component reads the same entries with
 * `useQuery` (the keys come from the routes, which both clients share).
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(getQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={useDehydratedState()}>{children}</HydrationBoundary>
      {Devtools && (
        <Suspense>
          <Devtools />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}

function useDehydratedState(): DehydratedState | undefined {
  const matches = useMatches();
  return useMemo(() => {
    const states = matches.flatMap((match) => {
      const state = (match.loaderData as { dehydratedState?: DehydratedState } | undefined)?.dehydratedState;
      return state ? [state] : [];
    });
    if (states.length === 0) return undefined;
    return { queries: states.flatMap((state) => state.queries), mutations: [] };
  }, [matches]);
}

// Dev only: the dynamic import is dropped from production builds.
const Devtools = import.meta.env.DEV
  ? lazy(() => import("@tanstack/react-query-devtools").then((m) => ({ default: m.ReactQueryDevtools })))
  : null;

/**
 * `useMutation` options for a route: `mutate(input)` calls it, the error is typed as the route's
 * failure union (declared errors included), and the mutation key is the route's key prefix.
 *
 * @example
 * const create = useMutation(routeMutation(api.postTodos, { onSuccess: () => ... }));
 * create.mutate({ body: { title } });
 */
export function routeMutation<R extends AnyRoute, E, TContext = unknown>(
  caller: RouteCaller<R, E>,
  options?: Omit<UseMutationOptions<RouteOutput<R>, RouteFailure<R, E>, RouteInput<R>, TContext>, "mutationFn">,
): UseMutationOptions<RouteOutput<R>, RouteFailure<R, E>, RouteInput<R>, TContext> {
  return {
    mutationKey: routeKeyPrefix(caller),
    ...options,
    mutationFn: (input) => caller.orThrow(...([input] as RouteArgs<R>)),
  };
}
