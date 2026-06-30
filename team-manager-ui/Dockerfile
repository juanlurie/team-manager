FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
ARG GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
RUN sed -i "s|YOUR_GOOGLE_CLIENT_ID\.apps\.googleusercontent\.com|${GOOGLE_CLIENT_ID}|g" \
      src/environments/environment.prod.ts
RUN npx ng build --configuration production

FROM nginx:alpine
RUN apk upgrade --no-cache
COPY --from=build /app/dist/team-manager-ui/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
