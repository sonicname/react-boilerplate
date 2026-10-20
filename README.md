# React Boilerplate

A full-stack [React Router](https://reactrouter.com/) (framework mode, SSR) starter where pages and
API endpoints live in feature modules, and every API call is typed end to end:

| Library                                                                  | Role                                                                                      |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| [modules-page-routing](https://www.npmjs.com/package/modules-page-routing) | File-based routes for module pages (`modules/*/pages`) and API files (`api/`, `modules/*/api`) |
| [auto-types-api](https://www.npmjs.com/package/auto-types-api)           | Typed, validated endpoints in API files; generates the client; OpenAPI                    |
| [endpoint-kit](https://www.npmjs.com/package/endpoint-kit)               | The typed API client used by pages (and anything else)                                    |
| [TanStack Query](https://tanstack.com/query)                             | Browser cache: SSR prefetch + hydration, `useQuery` / `useMutation` on the typed routes   |
| [Mantine](https://mantine.dev)                                           | UI components, notifications, light/dark color scheme (SSR safe, no runtime CSS-in-JS)    |

Also included: TypeScript, Tailwind CSS 4, Zod 4, Vite 8, Tabler icons.

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
  root.tsx                      Document shell (MantineProvider, ColorSchemeScript), error boundary
  app.css                       Tailwind + Mantine styles and their cascade layer order
  routes.ts                     Builds the routes from the file system (modules-page-routing)
  api/                          App-wide API routes      → /api/...
    health.ts                   GET /api/health
    openapi.ts                  GET /api/openapi (OpenAPI 3.1 from the endpoint schemas)
  modules/
    __root.tsx                  Layout shared by module pages (nav, color scheme toggle)
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
    theme.ts                    Mantine theme
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

## UI with Mantine

Mantine ships plain CSS (no runtime CSS-in-JS), so components render the same on the server and
in the browser. The setup lives in `app/root.tsx`, `app/app.css` and `postcss.config.js`:

- **Color scheme**: `defaultColorScheme="auto"` follows the OS until the user picks one with the
  header toggle (saved in `localStorage`). `ColorSchemeScript` applies it before the first paint,
  so SSR pages never flash the wrong theme. In components, render both variants and hide one with
  `lightHidden` / `darkHidden` instead of branching on the scheme, which the server cannot know.
- **Tailwind alongside**: `app.css` orders the cascade layers `theme, base, mantine, components,
  utilities`. Tailwind's reset never touches Mantine components, and utilities still override
  them (`<Button className="mt-4">`). The `dark:` variant follows Mantine's scheme.
- **Notifications**: `notifications.show({ message })` from anywhere, e.g. a mutation's `onSuccess`.
- **Theme**: edit `app/lib/theme.ts` ([theme object](https://mantine.dev/theming/theme-object/)).
- **CSS modules**: `*.module.css` files can use Mantine's mixins (`@mixin dark`, `@mixin hover`,
  `rem()`, `$mantine-breakpoint-md`) through `postcss-preset-mantine`.

More packages plug into the same provider: `@mantine/form`, `@mantine/dates`, `@mantine/modals`,
`@mantine/charts`, `@mantine/spotlight` (import each one's `styles.layer.css` in `app.css`).

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
