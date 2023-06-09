const express = require('express');
const bodyParser = require('body-parser');
const redis = require('redis');
const redisRatelimitStore = require("rate-limit-redis");
require('dotenv').config();

// middleware
const morgan = require('morgan');
const rateLimit = require("express-rate-limit");

const app = express();
const port = process.env.PORT || 3000;

// connect to Redis database
// NOTE: this will be reused by the rate limiter too!
const redisClient = redis.createClient({
    url: process.env.REDIS_URL,
    password: process.env.PASSWORD
});

redisClient.on('error', (error) => console.error(`Error : ${error}`));
redisClient.connect();

const logger = morgan('":method :url HTTP/:http-version" :status :res[content-length] ":user-agent"');
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    store: new redisRatelimitStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
        prefix: 'rate-limit',
    })
});

app.use(logger);
app.use(limiter);

app.use((res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

app.use(bodyParser.json());

app.get('/sync', async (req, res) => {
    const counter = await redisClient.get('counter');
    res.status(200).send({count: parseInt(counter)});
});

app.post('/update', async (req, res) => {
    let counter = await redisClient.get('counter');
    console.log(req.body);
    if (!req.body.count ||
        !Number.isInteger(req.body.count) ||
        req.body.count < 1 ||
        req.body.count > 10 ||
        // check if reqeuest is from an event
        req.body.e === undefined ||
        !req.body.e.isTrusted) {
        return res.sendStatus(400);
    }

    const updatedCount = parseInt(counter) + req.body.count;
    console.log(req.body.count);

    await redisClient.set('counter', updatedCount);
    res.sendStatus(200);
});

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});
