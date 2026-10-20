import {
  Badge,
  Button,
  Container,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconSearch } from '@tabler/icons-react';
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
      onSuccess: (todo) => {
        notifications.show({ color: 'green', message: `Added "${todo.title}"` });
        // Every cached list (any search) may now be missing the new todo.
        return queryClient.invalidateQueries({
          queryKey: routeKeyPrefix(api.getTodos),
        });
      },
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
    <Container component='main' size='sm' py='xl'>
      <Stack gap='lg'>
        <Group justify='space-between'>
          <Title order={1} size='h2'>
            Todos
          </Title>
          {isFetching && <Loader size='xs' aria-label='Refreshing' />}
        </Group>

        <Form method='get' role='search'>
          <TextInput
            name='q'
            type='search'
            defaultValue={q}
            placeholder='Search todos'
            aria-label='Search todos'
            leftSection={<IconSearch size={16} />}
          />
        </Form>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const title = String(new FormData(form).get('title') ?? '');
            create.mutate({ body: { title } }, { onSuccess: () => form.reset() });
          }}
        >
          <Group align='flex-start' gap='xs'>
            <TextInput
              name='title'
              placeholder='What needs doing?'
              aria-label='New todo'
              error={createError}
              style={{ flex: 1 }}
            />
            <Button type='submit' loading={create.isPending}>
              Add
            </Button>
          </Group>
        </form>

        {todos.length === 0 ? (
          <Text c='dimmed'>
            {q ? `No todos match "${q}".` : 'Nothing to do yet.'}
          </Text>
        ) : (
          <Paper withBorder component='ul' p={0} m={0} style={{ listStyle: 'none' }}>
            {todos.map((todo, index) => (
              <li key={todo.id}>
                <UnstyledButton
                  component={Link}
                  to={`/todos/${todo.id}`}
                  display='flex'
                  w='100%'
                  px='md'
                  py='sm'
                  className='items-center justify-between hover:bg-(--mantine-color-default-hover)'
                  style={
                    index > 0
                      ? { borderTop: '1px solid var(--mantine-color-default-border)' }
                      : undefined
                  }
                >
                  <Text td={todo.done ? 'line-through' : undefined} c={todo.done ? 'dimmed' : undefined}>
                    {todo.title}
                  </Text>
                  <Badge variant='light' color={todo.done ? 'gray' : 'blue'}>
                    {todo.done ? 'Done' : 'Open'}
                  </Badge>
                </UnstyledButton>
              </li>
            ))}
          </Paper>
        )}
      </Stack>
    </Container>
  );
}
