import { NavLink, Outlet } from "react-router";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/todos", label: "Todos", end: false },
];

// Shared layout of every module page (wired in app/routes.ts).
export default function RootLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <nav className="container mx-auto flex items-center gap-6 px-4 py-3 text-sm">
          {links.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                isActive
                  ? "font-semibold text-blue-700 dark:text-blue-400"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              }
            >
              {label}
            </NavLink>
          ))}
          <a
            href="/api/openapi"
            className="ml-auto text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            OpenAPI
          </a>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
