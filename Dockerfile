FROM node:16

WORKDIR /utils

COPY src src
COPY package.json package.json

RUN npm i

CMD npm start
