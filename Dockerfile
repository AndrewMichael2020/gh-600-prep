FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY public ./public
COPY prompts ./prompts
RUN npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/prompts ./prompts

# Copy pre-generated exam data and published PDFs baked at image build time.
# data/attempts/ is excluded via .dockerignore (ephemeral, not needed in image).
RUN mkdir -p data/exams data/attempts
COPY data ./data

EXPOSE 8080
CMD ["node", "dist/server.js"]
