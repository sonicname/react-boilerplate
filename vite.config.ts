import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { autoTypesApi } from "auto-types-api/vite";
import { defineConfig } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";

export default defineConfig({
  plugins: [
    // Generates app/api.gen.ts (typed endpoint-kit client) and app/api.gen.server.ts
    // (in-process calls for loaders) from the API files, and keeps them in sync in dev.
    autoTypesApi(),
    tailwindcss(),
    reactRouter(),
    // Serves /.well-known/appspecific/com.chrome.devtools.json in dev so Chrome DevTools
    // can map the project as a workspace (and React Router stops logging "No route matches").
    devtoolsJson(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
});
