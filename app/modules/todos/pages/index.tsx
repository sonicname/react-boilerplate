import {
  dehydrate,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { routeKeyPrefix } from 'endpoint-kit/tanstack-query';
import { Form, Link } from 'react-router';
import { api } from '~/lib/api';
import { serverApi } from '~/lib/api.server';
import { getQueryClient, makeQueryClient, routeMutation } from '~/lib/query';
import { todoQueries } from '../queries';
import type { Route } from './+types/index';

export function meta({}: Route.MetaArgs) {
  return [{ title: 'Todos' }];
}

const searchTerm = (request: Request) =>
  new URL(request.url).searchParams.get('q') ?? '';

// First load (SSR): prefetch in-process with serverApi, hand the cache to the browser.
export async function loader({ request, context }: Route.LoaderArgs) {
  const q = searchTerm(request);
  const queryClient = makeQueryClient();
  await queryClient.query(todoQueries.list(serverApi({ request, context }), q));
  return { q, dehydratedState: dehydrate(queryClient) };
}

// Client navigations (search, back from a todo): GET /api/todos over HTTP, or the cache if fresh.
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const q = searchTerm(request);
  await getQueryClient().query(todoQueries.list(api, q));
  return { q };
}

export default function Todos({ loaderData }: Route.ComponentProps) {
  const { q } = loaderData;
  const queryClient = useQueryClient();
  const { data: todos = [], isFetching } = useQuery(todoQueries.list(api, q));
  const create = useMutation(
    routeMutation(api.postTodos, {
      // Every cached list (any search) may now be missing the new todo.
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: routeKeyPrefix(api.getTodos),
        }),
    }),
  );

  const createError = (() => {
    const error = create.error;
    if (!error) return null;
    // Declared error (409): typed status and body.
    if (error._tag === 'EndpointError') return error.data.message;
    // The API rejected the body (400).
    if (error._tag === 'ApiError' && error.status === 400)
      return 'Title must be 1 to 120 characters.';
    return 'Could not add the todo, try again.';
  })();

  return (
    <main className='container mx-auto max-w-2xl space-y-6 px-4 py-10'>
      <div className='flex items-baseline justify-between'>
        <h1 className='text-2xl font-semibold'>Todos</h1>
        {isFetching && (
          <span className='text-xs text-gray-500'>Refreshing...</span>
        )}
      </div>

      <Form method='get' role='search'>
        <input
          name='q'
          type='search'
          defaultValue={q}
          placeholder='Search todos'
          aria-label='Search todos'
          className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900'
        />
      </Form>

      <form
        className='flex gap-2'
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const title = String(new FormData(form).get('title') ?? '');
          create.mutate({ body: { title } }, { onSuccess: () => form.reset() });
        }}
      >
        <input
          name='title'
          placeholder='What needs doing?'
          aria-label='New todo'
          aria-invalid={createError ? true : undefined}
          className='flex-1 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900'
        />
        <button
          type='submit'
          disabled={create.isPending}
          className='rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60'
        >
          {create.isPending ? 'Adding...' : 'Add'}
        </button>
      </form>
      {createError && (
        <p role='alert' className='text-sm text-red-600 dark:text-red-400'>
          {createError}
        </p>
      )}

      {todos.length === 0 ? (
        <p className='text-gray-500'>
          {q ? `No todos match "${q}".` : 'Nothing to do yet.'}
        </p>
      ) : (
        <ul className='divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-800'>
          {todos.map((todo) => (
            <li key={todo.id}>
              <Link
                to={`/todos/${todo.id}`}
                className='flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900'
              >
                <span
                  className={
                    todo.done ? 'text-gray-400 line-through' : undefined
                  }
                >
                  {todo.title}
                </span>
                <span className='text-xs text-gray-500'>
                  {todo.done ? 'Done' : 'Open'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
