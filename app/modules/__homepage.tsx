import type { Route } from "./+types/__homepage";
import { Welcome } from "~/welcome/welcome";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "React Boilerplate" },
    { name: "description", content: "React Router + modules-page-routing + endpoint-kit + auto-types-api" },
  ];
}

export default function Home() {
  return <Welcome />;
}
