import { Anchor, Badge, Button, Container, Group, Stack, Text, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconArrowLeft } from "@tabler/icons-react";
import { dehydrate, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { routeKeyPrefix } from "endpoint-kit/tanstack-query";
import { Link, useNavigate } from "react-router";
import { api } from "~/lib/api";
import { serverApi } from "~/lib/api.server";
import { getQueryClient, makeQueryClient, routeMutation } from "~/lib/query";
import { loadTodo, todoQueries } from "../queries";
import type { Route } from "./+types/[id]";

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: loaderData ? loaderData.title : "Todo" }];
}

// First load (SSR): GET /api/todos/:id in-process; a declared 404 renders the error boundary.
export async function loader({ request, context, params }: Route.LoaderArgs) {
  const queryClient = makeQueryClient();
  const todo = await loadTodo(queryClient, serverApi({ request, context }), params.id);
  return { title: todo.title, dehydratedState: dehydrate(queryClient) };
}

// Client navigations: over HTTP with api, or straight from the cache when the entry is fresh.
export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const todo = await loadTodo(getQueryClient(), api, params.id);
  return { title: todo.title };
}

const showError = (error: { _tag: string }) =>
  notifications.show({
    color: "red",
    message: error._tag === "EndpointError" ? "This todo no longer exists." : "Something went wrong, try again.",
  });

export default function TodoDetail({ params }: Route.ComponentProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const detail = todoQueries.detail(api, params.id);
  const { data: todo } = useQuery(detail);
  const listKey = routeKeyPrefix(api.getTodos);

  const toggle = useMutation(
    routeMutation(api.patchTodosById, {
      onSuccess: (updated) => {
        queryClient.setQueryData(detail.queryKey, updated);
        return queryClient.invalidateQueries({ queryKey: listKey });
      },
      onError: showError,
    }),
  );
  const remove = useMutation(
    routeMutation(api.deleteTodosById, {
      onSuccess: async () => {
        notifications.show({ message: `Deleted "${todo?.title}"` });
        // Stale but not refetched: this page is leaving (removing the entry now would make its
        // useQuery fetch the deleted todo again), and a later visit refetches and gets the 404.
        void queryClient.invalidateQueries({ queryKey: detail.queryKey, refetchType: "none" });
        await queryClient.invalidateQueries({ queryKey: listKey });
        await navigate("/todos");
      },
      onError: showError,
    }),
  );
  const busy = toggle.isPending || remove.isPending;

  // The loader put the todo in the cache before this renders.
  if (!todo) return null;

  return (
    <Container component="main" size="sm" py="xl">
      <Stack gap="lg">
        <Anchor component={Link} to="/todos" size="sm">
          <Group gap={4}>
            <IconArrowLeft size={14} /> All todos
          </Group>
        </Anchor>
        <Stack gap="xs">
          <Title order={1} size="h2">
            {todo.title}
          </Title>
          <Group gap="xs">
            <Badge variant="light" color={todo.done ? "gray" : "blue"}>
              {todo.done ? "Done" : "Open"}
            </Badge>
            <Text size="sm" c="dimmed">
              created <time dateTime={todo.createdAt}>{new Date(todo.createdAt).toLocaleDateString()}</time>
            </Text>
          </Group>
        </Stack>
        <Group gap="xs">
          <Button
            variant="default"
            disabled={busy && !toggle.isPending}
            loading={toggle.isPending}
            onClick={() => toggle.mutate({ params: { id: params.id }, body: { done: !todo.done } })}
          >
            {todo.done ? "Mark as open" : "Mark as done"}
          </Button>
          <Button
            color="red"
            variant="light"
            disabled={busy && !remove.isPending}
            loading={remove.isPending}
            onClick={() => remove.mutate({ params: { id: params.id } })}
          >
            Delete
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}
