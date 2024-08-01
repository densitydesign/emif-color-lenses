FROM node:lts-alpine AS build-env
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm i
COPY . .
RUN npm run build

FROM nginx:alpine
COPY index.html assets /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets
COPY --from=build-env /app/bundle.js /usr/share/nginx/html/
RUN chmod -R 755 /usr/share/nginx/html
