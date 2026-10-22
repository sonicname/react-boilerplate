import {
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Button,
  Container,
  Group,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";
import { Link, Outlet, useMatch } from "react-router";
import { usePublicEnv } from "~/lib/env";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/todos", label: "Todos", end: false },
];

// Shared layout of every module page (wired in app/routes.ts).
export default function RootLayout() {
  return (
    <>
      <Box component="header" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}>
        <Container component="nav" size="lg" py="xs">
          <Group gap="xs">
            {links.map((link) => (
              <NavItem key={link.to} {...link} />
            ))}
            <EnvBadge />
            <Anchor href="/api/openapi" size="sm" c="dimmed" ml="auto">
              OpenAPI
            </Anchor>
            <ColorSchemeToggle />
          </Group>
        </Container>
      </Box>
      <Outlet />
    </>
  );
}

function NavItem({ to, label, end }: (typeof links)[number]) {
  const active = useMatch({ path: to, end }) !== null;
  return (
    <Button
      component={Link}
      to={to}
      variant={active ? "light" : "subtle"}
      color={active ? undefined : "gray"}
      size="compact-sm"
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Button>
  );
}

// Reminds everyone which deployment they are looking at; production shows nothing.
function EnvBadge() {
  const { APP_ENV } = usePublicEnv();
  if (APP_ENV === "production") return null;
  return (
    <Badge variant="light" color={APP_ENV === "staging" ? "orange" : "gray"} ml="xs">
      {APP_ENV}
    </Badge>
  );
}

function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  // The server does not know the scheme: read it after hydration, and let CSS pick the icon
  // (lightHidden / darkHidden) so the server HTML and the first client render match.
  const computed = useComputedColorScheme("light", { getInitialValueInEffect: true });
  return (
    <ActionIcon
      variant="default"
      size="lg"
      aria-label="Toggle color scheme"
      onClick={() => setColorScheme(computed === "light" ? "dark" : "light")}
    >
      <Box component="span" darkHidden>
        <IconMoon size={18} stroke={1.5} />
      </Box>
      <Box component="span" lightHidden>
        <IconSun size={18} stroke={1.5} />
      </Box>
    </ActionIcon>
  );
}
