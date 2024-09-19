#! bin/bash
#
# Script to generate new certificates for all the services that use https to communicate.

# Authenticator
openssl req -x509 -newkey rsa:4096 -keyout services/authenticator/certificate/key.pem -out services/authenticator/certificate/cert.pem -sha256 -days 365 -nodes \
    -subj "/C=NL/CN=authenticator" \
    -addext "subjectAltName = DNS:localhost, DNS:authenticator, DNS:authenticator.vulcan-application.svc.cluster.local"

# God-Manager
openssl req -x509 -newkey rsa:4096 -keyout services/god-manager/certificate/key.pem -out services/god-manager/certificate/cert.pem -sha256 -days 365 -nodes \
    -subj "/C=NL/CN=god-manager" \
    -addext "subjectAltName = DNS:localhost, DNS:god-manager, DNS:god-manager.vulcan-application.svc.cluster.local"

# User-Manager
openssl req -x509 -newkey rsa:4096 -keyout services/user-manager/certificate/key.pem -out services/user-manager/certificate/cert.pem -sha256 -days 365 -nodes \
    -subj "/C=NL/CN=user-manager" \
    -addext "subjectAltName = DNS:localhost, DNS:user-manager, DNS:user-manager.vulcan-application.svc.cluster.local"

# Vulcan
openssl req -x509 -newkey rsa:4096 -keyout services/vulcan/certificate/key.pem -out services/vulcan/certificate/cert.pem -sha256 -days 365 -nodes \
    -subj "/C=NL/CN=vulcan" \
    -addext "subjectAltName = DNS:localhost, DNS:vulcan, DNS:vulcan.vulcan-application.svc.cluster.local"

# Notes-Queue
openssl req -x509 -newkey rsa:4096 -keyout services/message-queues/kafka/certificate/key.pem -out services/message-queues/kafka/certificate/cert.pem -sha256 -days 365 -nodes \
    -subj "/C=NL/CN=notes-queue" \
    -addext "subjectAltName = DNS:localhost, DNS:notes-queue, DNS:notes-queue.vulcan-application.svc.cluster.local"

# Scribe
openssl req -x509 -newkey rsa:4096 -keyout services/scribe/certificate/key.pem -out services/scribe/certificate/cert.pem -sha256 -days 365 -nodes \
    -subj "/C=NL/CN=scribe" \
    -addext "subjectAltName = DNS:localhost, DNS:scribe, DNS:scribe.vulcan-application.svc.cluster.local"

echo "Generated new certificates for services."