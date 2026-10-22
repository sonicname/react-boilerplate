import { Code, ColorSchemeScript, Container, MantineProvider, mantineHtmlProps, Text, Title } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import { publicEnv } from "./lib/env.server";
import { QueryProvider } from "./lib/query";
import { theme } from "./lib/theme";
import "./app.css";

// The public configuration for the browser: read it anywhere with usePublicEnv() (lib/env.ts).
export function loader() {
  return { env: publicEnv };
}

// It never changes while the app runs, so client navigations need not refetch it.
export const shouldRevalidate = () => false;

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

// The color scheme lives in localStorage, which the server cannot read: ColorSchemeScript sets it
// on <html> before the first paint (no flash), and mantineHtmlProps silences the attribute mismatch.
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <ColorSchemeScript defaultColorScheme="auto" />
        <Meta />
        <Links />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="auto">
          <Notifications />
          {children}
        </MantineProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <QueryProvider>
      <Outlet />
    </QueryProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <Container component="main" pt={64} pb="md">
      <Title>{message}</Title>
      <Text mt="xs">{details}</Text>
      {stack && (
        <Code block mt="md">
          {stack}
        </Code>
      )}
    </Container>
  );
}
