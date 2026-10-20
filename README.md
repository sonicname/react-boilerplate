# React Boilerplate

A full-stack [React Router](https://reactrouter.com/) (framework mode, SSR) starter where pages and
API endpoints live in feature modules, and every API call is typed end to end:

| Library                                                                  | Role                                                                                      |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| [modules-page-routing](https://www.npmjs.com/package/modules-page-routing) | File-based routes for module pages (`modules/*/pages`) and API files (`api/`, `modules/*/api`) |
| [auto-types-api](https://www.npmjs.com/package/auto-types-api)           | Typed, validated endpoints in API files; generates the client; OpenAPI                    |
| [endpoint-kit](https://www.npmjs.com/package/endpoint-kit)               | The typed API client used by pages (and anything else)                                    |
| [TanStack Query](https://tanstack.com/query)                             | Browser cache: SSR prefetch + hydration, `useQuery` / `useMutation` on the typed routes   |

Also included: TypeScript, Tailwind CSS 4, Zod 4, Vite 8.

## Getting started

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

Open `/todos` for the example module and `/api/openapi` for the generated API description.

## Scripts

| Script              | What it does                                                         |
| ------------------- | -------------------------------------------------------------------- |
| `pnpm dev`          | Dev server with HMR; regenerates the API client when API files change |
| `pnpm build`        | Production build                                                     |
| `pnpm start`        | Serve the production build                                           |
| `pnpm typecheck`    | Generate the API client and route types, then run `tsc`              |
| `pnpm routes`       | Print the page and API route tree                                    |
| `pnpm routes:check` | Validate route files (duplicates, conflicts, orphans)                |

## Project structure

```text
app/
  root.tsx                      Document shell, global error boundary
  routes.ts                     Builds the routes from the file system (modules-page-routing)
  api/                          App-wide API routes      → /api/...
    health.ts                   GET /api/health
    openapi.ts                  GET /api/openapi (OpenAPI 3.1 from the endpoint schemas)
  modules/
    __root.tsx                  Layout shared by module pages (nav)
    __homepage.tsx              /
    todos/                      Example feature module
      pages/index.tsx           /todos       list, search, create
      pages/[id].tsx            /todos/:id   detail, toggle, delete
      api/index.ts              GET, POST /api/todos
      api/$id.ts                GET, PATCH, DELETE /api/todos/:id
      queries.ts                Query options shared by loaders, clientLoaders and components
      schemas.ts                Zod schemas shared by API and pages
      todos.server.ts           Data access (server only)
  lib/
    api.server.ts               serverApi(): typed client for loaders/actions (in-process)
    api.ts                      api: typed client for browser code
    query.tsx                   QueryClient, QueryProvider (hydration), routeMutation()
  api.gen.ts                    generated, git-ignored: typed endpoint-kit routes
  api.gen.server.ts             generated, git-ignored: in-process handlers for serverApi()
```

## How a request flows

```text
pages/index.tsx loader ──serverApi().getTodos()──▶ api/index.ts GET ──▶ todos.server.ts
        (typed input/output)          (in-process, no HTTP)   (validated by Zod)
```

1. **Declare** endpoints in an API file with `api.get/post/...` and Zod schemas, and serve them as
   the route's `loader` / `action`:

   ```ts
   // app/modules/todos/api/$id.ts  →  /api/todos/:id
   const GET = api.get(
     { params, response: Todo, errors: { 404: Problem } },
     ({ params, error }) => findTodo(params.id) ?? error(404, { message: "Not found" }),
   );

   export const loader = api.serve({ GET, PATCH, DELETE });
   export const action = loader;
   ```

   Keep endpoints unexported: React Router strips `loader` / `action` from the browser bundle,
   together with everything only they use (handlers, schemas, `.server` modules).

2. **Generate**: the `autoTypesApi()` Vite plugin (and `pnpm typecheck`) writes `app/api.gen.ts`,
   one typed endpoint-kit route per endpoint (`getTodosById`, `patchTodosById`, ...).

3. **Call** it from loaders and actions with full types, including declared errors:

   ```ts
   export async function loader({ request, context, params }: Route.LoaderArgs) {
     const result = await serverApi({ request, context }).getTodosById({ params: { id: params.id } });
     if (result.ok) return { todo: result.data };
     if (result.error._tag === "EndpointError") throw data(result.error.data.message, { status: 404 });
     throw result.error;
   }
   ```

   In browser code, use `api` from `~/lib/api` (same routes, same-origin `fetch`).

## Client-side data with TanStack Query

`endpoint-kit/tanstack-query` turns a route into query options keyed `[method, path, input]`.
`api` and `serverApi()` share the generated routes, so a loader and a component that build the
same input hit the same cache entry. Define the options once per module and pass the client:

```ts
// app/modules/todos/queries.ts
export const todoQueries = {
  list: (client: Client, q: string) => routeQuery(client.getTodos, { query: q ? { q } : {} }),
  detail: (client: Client, id: string) => routeQuery(client.getTodosById, { params: { id } }),
};
```

```ts
// First load: prefetch in-process, return the cache. QueryProvider (root.tsx) hydrates it.
export async function loader({ request, context }: Route.LoaderArgs) {
  const queryClient = makeQueryClient();
  await queryClient.query(todoQueries.list(serverApi({ request, context }), q));
  return { q, dehydratedState: dehydrate(queryClient) };
}

// Client navigations: HTTP through `api`, or the cache while it is fresh (staleTime: 60s).
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  await getQueryClient().query(todoQueries.list(api, q));
  return { q };
}

// Component: typed data and errors (declared errors included).
const { data } = useQuery(todoQueries.list(api, q));
const create = useMutation(
  routeMutation(api.postTodos, {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: routeKeyPrefix(api.getTodos) }),
  }),
);
```

Build inputs only through the shared options: `{ params: { id: "1" } }` and `{ params: { id: 1 } }`
(or `{ query: {} }` and no query) are different keys, even though the API accepts both. In dev,
the React Query Devtools (bottom corner) show the cache.

## Adding a module

1. Create `app/modules/<name>/pages/index.tsx` → `/<name>` (see the
   [file naming conventions](https://www.npmjs.com/package/modules-page-routing)).
2. Add API files under `app/modules/<name>/api/` → `/api/<name>/...`: `index.ts` is the module
   root (`/api/<name>`), `$id.ts` → `/api/<name>/:id`, `stats.ts` → `/api/<name>/stats`. Every
   `.ts` file there is a route, so put shared code next to it (`schemas.ts`, `*.server.ts`).
3. Run `pnpm dev` (or `pnpm typecheck`): the new endpoints appear on `serverApi()` and `api`,
   named after method and URL (`GET /api/<name>/:id` → `get<Name>ById`).

## Deployment

```bash
pnpm build
pnpm start        # serves build/ with @react-router/serve
```

Deploy `package.json`, the lockfile and `build/` (`build/client` static assets, `build/server`
server code) to any Node.js host.

### Docker

```bash
docker build -t react-boilerplate .
docker run -p 3000:3000 react-boilerplate
```

The image installs dependencies with pnpm (the version pinned in `packageManager`), builds the
app (which generates the API client) and runs it with production dependencies only.

---

Built with [React Router](https://reactrouter.com/).
