FROM golang:1.24.1-alpine3.21 AS builder

WORKDIR /usr/src/app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -ldflags="-s -w" -o /usr/local/bin/app .

FROM alpine:3.21

WORKDIR /root/

COPY ./database/schema.sql /root/schema.sql
COPY ./firebase.json /root/firebase.json
COPY ./apn.p12 /root/apn.p12

COPY --from=builder /usr/local/bin/app /usr/local/bin/app

EXPOSE 8080

CMD ["app"]