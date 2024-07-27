#! bin/bash
#
# Script to generate new certificates for all the services that use https to communicate.

# Authenticator
openssl req -x509 -newkey rsa:4096 -keyout services/authenticator/certificate/key.pem -out services/authenticator/certificate/cert.pem -sha256 -days 365 -nodes \
    -subj "/C=NL/CN=authenticator" \
    -addext "subjectAltName = DNS:localhost, DNS:authenticator"

# God-Manager
openssl req -x509 -newkey rsa:4096 -keyout services/god-manager/certificate/key.pem -out services/god-manager/certificate/cert.pem -sha256 -days 365 -nodes \
    -subj "/C=NL/CN=god-manager" \
    -addext "subjectAltName = DNS:localhost, DNS:god-manager"

# User-Manager
openssl req -x509 -newkey rsa:4096 -keyout services/user-manager/certificate/key.pem -out services/user-manager/certificate/cert.pem -sha256 -days 365 -nodes \
    -subj "/C=NL/CN=user-manager" \
    -addext "subjectAltName = DNS:localhost, DNS:user-manager"

# Vulcan
openssl req -x509 -newkey rsa:4096 -keyout services/vulcan/certificate/key.pem -out services/vulcan/certificate/cert.pem -sha256 -days 365 -nodes \
    -subj "/C=NL/CN=vulcan" \
    -addext "subjectAltName = DNS:localhost, DNS:vulcan"

echo "Generated new certificates for services."