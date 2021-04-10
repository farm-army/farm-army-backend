FROM nikolaik/python-nodejs:latest as build
RUN apt install git
WORKDIR /src/
COPY package.json package-lock.json ./
RUN npm install


FROM node:14 as publish
RUN apt-get autoremove
RUN apt-get autoclean
RUN apt-get clean
RUN apt-get update
RUN apt-get -y dist-upgrade
RUN apt-get install sqlite3
WORKDIR /farmarmy
COPY . ./
COPY --from=build /src ./


EXPOSE 3000
RUN chmod +x start.sh
RUN mkdir -p var/cache
RUN mkdir -p db
RUN sqlite3 db/db.db < db.sql
ENTRYPOINT ["/bin/sh", "-c", "/farmarmy/start.sh"]

LABEL org.label-schema.name="farm.army backend"
