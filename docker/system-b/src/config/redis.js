import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

const redis = createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
});

redis.on("error", err => console.error("Error de Redis:", err));

export default redis;
