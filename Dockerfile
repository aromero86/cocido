# cocido's site: built with Node, served as static files by nginx.

# Astro 7 needs Node 22.23.4 or later.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# The address the site is published at: its canonical URLs and its sitemap.
ARG SITE_URL=https://cocido.dev
ENV SITE_URL=$SITE_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
