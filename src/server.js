import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

import { db } from "./db.js";

dotenv.config();

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: true,
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET || "dev_secret",
});

app.get("/api/v1/health", async () => ({
  status: "ok",
  service: "reVine",
  version: "0.2.0",
}));

// Register
app.post("/api/v1/auth/register", async (request, reply) => {
  const { username, email, password } = request.body;

  if (!username || !email || !password) {
    return reply.code(400).send({
      error: "missing_fields",
    });
  }

  const existing = await db.query(
    "SELECT id FROM users WHERE email = $1",
    [email]
  );

  if (existing.rows.length > 0) {
    return reply.code(409).send({
      error: "email_exists",
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await db.query(
    `
    INSERT INTO users(username,email,password)
    VALUES($1,$2,$3)
    RETURNING id,username,email
    `,
    [username, email, hashedPassword]
  );

  const user = result.rows[0];

  const token = app.jwt.sign({
    id: user.id,
  });

  return {
    token,
    user,
  };
});

// Login
app.post("/api/v1/auth/login", async (request, reply) => {
  const { email, password } = request.body;

  const result = await db.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  if (result.rows.length === 0) {
    return reply.code(401).send({
      error: "invalid_login",
    });
  }

  const user = result.rows[0];

  const valid = await bcrypt.compare(
    password,
    user.password
  );

  if (!valid) {
    return reply.code(401).send({
      error: "invalid_login",
    });
  }

  const token = app.jwt.sign({
    id: user.id,
  });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
    },
  };
});

// Current user
app.get("/api/v1/auth/me", async (request, reply) => {
  try {
    await request.jwtVerify();

    const result = await db.query(
      `
      SELECT
        id,
        username,
        email,
        avatar,
        bio
      FROM users
      WHERE id = $1
      `,
      [request.user.id]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({
        error: "user_not_found",
      });
    }

    return result.rows[0];
  } catch {
    return reply.code(401).send({
      error: "unauthorized",
    });
  }
});

app.listen({
  port: Number(process.env.PORT) || 3000,
  host: "0.0.0.0",
});