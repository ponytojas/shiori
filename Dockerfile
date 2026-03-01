# Build web frontend
FROM node:20-alpine AS web
WORKDIR /app/webapp
COPY webapp/package*.json ./
RUN npm ci
COPY webapp/ ./
RUN npm run build

# Build Go binary with embedded frontend assets
FROM golang:1.25-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git ca-certificates tzdata

COPY go.mod go.sum ./
RUN go mod download

COPY . .
COPY --from=web /app/webapp/dist ./webapp/dist

RUN go build -o /usr/local/bin/shiori main.go

# Runtime image
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata

ENV SHIORI_DIR=/shiori
ENV SHIORI_HTTP_PORT=8080
WORKDIR /shiori

LABEL org.opencontainers.image.source="https://github.com/go-shiori/shiori"
LABEL maintainer="Felipe Martin <github@fmartingr.com>"

COPY --from=builder /usr/local/bin/shiori /usr/local/bin/shiori

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/shiori"]
CMD ["server"]
