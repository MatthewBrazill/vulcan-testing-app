FROM golang:1.19

# Explose the http port for the app to connect. Still need to connect the port when launching the app
EXPOSE 80
EXPOSE 443

WORKDIR /usr/src/vulcan

# Set envars
ENV DD_ENV=docker
ENV DD_AGENT_HOST=datadog-agent
ENV DD_TRACE_AGENT_PORT=8126
ENV VULCAN_SESSION_KEY=2PbmuNW_uRkaf6Kux!ByK!yT!UmMZZ9B

# pre-copy/cache go.mod for pre-downloading dependencies and only redownloading them in subsequent builds if they change
COPY go.mod go.sum ./
RUN go mod download && go mod verify

COPY . .
RUN go build -v -o /usr/local/bin/vulcan ./src/...

CMD ["vulcan"]