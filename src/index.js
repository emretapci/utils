import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mainRouter from './main.js';

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.text());
app.use(bodyParser.json({ type: 'application/json', limit: '500kb' }));
app.use(cors());

app.use('/', mainRouter);

const port = process.env.PORT ? process.env.PORT : 3000;
app.listen(port, () => console.log(`Listening on port ${port}.`));
