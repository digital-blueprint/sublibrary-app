FROM httpd:2.4

RUN apt update && apt install -y openssl

ARG KEY_FILE=/usr/local/apache2/conf/server.key
ARG CERT_FILE=/usr/local/apache2/conf/server.crt

RUN openssl genrsa -out "${KEY_FILE}" 2048
RUN openssl req -new -out website.csr -sha256 -key "${KEY_FILE}" -subj "/C=fb/ST=foobar/L=foobar/O=foobar/OU=foobar/CN=foobar"
RUN openssl x509 -req -in website.csr -days 9999 -signkey "${KEY_FILE}" -out "${CERT_FILE}" -outform PEM

WORKDIR /usr/local/apache2/htdocs
