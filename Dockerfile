FROM node:lts-alpine AS build-env
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm i
COPY . .
RUN npm run build

FROM nginx:alpine
COPY index.html *.css *.png /usr/share/nginx/html/
COPY --from=build-env /app/bundle.js /usr/share/nginx/html/
RUN chmod -R 777 /usr/share/nginx/html
