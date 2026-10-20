// Mantine's mixins and functions in CSS files: `@mixin dark`, `@mixin hover`, `rem()`,
// `light-dark()`, `$mantine-breakpoint-*`. Tailwind runs as a Vite plugin, not here.
export default {
  plugins: {
    "postcss-preset-mantine": {},
    "postcss-simple-vars": {
      variables: {
        "mantine-breakpoint-xs": "36em",
        "mantine-breakpoint-sm": "48em",
        "mantine-breakpoint-md": "62em",
        "mantine-breakpoint-lg": "75em",
        "mantine-breakpoint-xl": "88em",
      },
    },
  },
};
