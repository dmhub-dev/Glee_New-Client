FROM node:20-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG VITE_API_BASE_URL
ARG VITE_CDN_BASE_URL
ARG VITE_PAYSTACK_PUBLIC_KEY
ARG VITE_ANALYTICS_ID

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_CDN_BASE_URL=$VITE_CDN_BASE_URL
ENV VITE_PAYSTACK_PUBLIC_KEY=$VITE_PAYSTACK_PUBLIC_KEY
ENV VITE_ANALYTICS_ID=$VITE_ANALYTICS_ID

RUN pnpm type-check
RUN pnpm build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
