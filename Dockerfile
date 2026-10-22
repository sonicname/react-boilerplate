FROM node:24-alpine AS base
# pnpm, pinned by the "packageManager" field in package.json.
RUN corepack enable
WORKDIR /app

FROM base AS development-dependencies-env
COPY package.json pnpm-lock.yaml /app/
RUN pnpm install --frozen-lockfile

FROM base AS production-dependencies-env
COPY package.json pnpm-lock.yaml /app/
RUN pnpm install --frozen-lockfile --prod

FROM base AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
# The auto-types-api Vite plugin generates app/api.gen*.ts during the build.
RUN pnpm run build

FROM base
ENV NODE_ENV=production
# Which `.env.<APP_ENV>` defaults to use; override per deployment: `docker run -e APP_ENV=staging`.
ENV APP_ENV=production
COPY package.json pnpm-lock.yaml .env.* /app/
# SQL migrations, applied by the app on startup (set DATABASE_URL when running the container).
COPY drizzle /app/drizzle
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
CMD ["pnpm", "run", "start"]
