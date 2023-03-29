FROM golang:1.19

WORKDIR /usr/src/vulcan

# Envars
ENV DD_ENV=docker
ENV DD_SERIVCE=vulcan-go
ENV DD_AGENT_HOST=datadog-agent
ENV DD_TRACE_AGENT_PORT=8126
ENV DD_TRACE_CLIENT_IP_ENABLED=true
ENV VULCAN_SESSION_KEY=2PbmuNW_uRkaf6Kux!ByK!yT!UmMZZ9B

# Labels
LABEL "com.datadoghq.ad.logs"='[{"type":"file", "source": "vulcan-app", "service": "vulcan-go", "path": "/vulcan-logs/*.log"}]'
LABEL "com.datadoghq.ad.tags"='["env:docker", "service:vulcan-go"]'

# pre-copy/cache go.mod for pre-downloading dependencies and only redownloading them in subsequent builds if they change
COPY go.mod go.sum ./
RUN go mod download && go mod verify

COPY . .
RUN go build -v -o /usr/local/bin/vulcan ./src/...

CMD vulcan