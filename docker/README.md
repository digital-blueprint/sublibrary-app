# Running with Docker

This is simple docker-compose setup using Docker with Apache.

## Setup

* `sudo usermod -aG docker $USER` to add yourself to the docker group
* `sudo apt install docker-compose` to install docker-compose

## Running the Server

* `docker-compose up` to start the server in the foreground
* Open http://127.0.0.1:8001 for HTTP
* Open https://127.0.0.1:9001 for HTTPS/HTTP2