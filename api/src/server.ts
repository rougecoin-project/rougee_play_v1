import Fastify from "fastify";
import { z } from "zod";
import { env, isProduction } from "./config.js";
import type { User } from "./auth.js";
import { hashPassword, verifyPassword, generateToken, verifyToken } from "./auth.js";

const app = Fastify({
  logger: !isProduction,
});

// Security plugins
await app.register(import("@fastify/helmet"), {
  contentSecurityPolicy: false, // Disable for development
});

await app.register(import("@fastify/cors"), {
  origin: env.CORS_ORIGIN,
  credentials: true,
});

await app.register(import("@fastify/rate-limit"), {
  max: env.RATE_LIMIT_MAX,
  timeWindow: env.RATE_LIMIT_TIME_WINDOW,
});

// In-memory store (replace with database in production)
const users: User[] = [];

// Extend FastifyRequest to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string;
      username: string;
    };
  }
}

// Authentication middleware
async function authenticate(request: any, reply: any) {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      reply.code(401).send({ error: 'No token provided' });
      return;
    }
    const payload = verifyToken(token);
    request.user = payload;
  } catch (error) {
    reply.code(401).send({ error: 'Invalid token' });
  }
}

// Validation schemas
const CreateUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Routes
app.get("/", async () => ({ 
  message: "Welcome to the Rougee Play API", 
  version: "1.0.0",
  environment: env.NODE_ENV 
}));

app.get("/health", async () => ({ 
  ok: true, 
  timestamp: new Date().toISOString(),
  uptime: process.uptime()
}));

// User registration
app.post("/auth/register", async (req, reply) => {
  try {
    const { username, email, password } = CreateUserSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = users.find(u => u.email === email || u.username === username);
    if (existingUser) {
      reply.code(409).send({ error: 'User already exists' });
      return;
    }
    
    const passwordHash = await hashPassword(password);
    const user: User = {
      id: crypto.randomUUID(),
      username,
      email,
      passwordHash,
      createdAt: new Date(),
    };
    
    users.push(user);
    
    const token = generateToken({ userId: user.id, username: user.username });
    
    reply.code(201).send({
      user: { id: user.id, username: user.username, email: user.email },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      reply.code(400).send({ error: 'Validation failed', details: error.issues });
    } else {
      reply.code(500).send({ error: 'Internal server error' });
    }
  }
});

// User login
app.post("/auth/login", async (req, reply) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);
    
    const user = users.find(u => u.email === email);
    if (!user) {
      reply.code(401).send({ error: 'Invalid credentials' });
      return;
    }
    
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      reply.code(401).send({ error: 'Invalid credentials' });
      return;
    }
    
    const token = generateToken({ userId: user.id, username: user.username });
    
    reply.send({
      user: { id: user.id, username: user.username, email: user.email },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      reply.code(400).send({ error: 'Validation failed', details: error.issues });
    } else {
      reply.code(500).send({ error: 'Internal server error' });
    }
  }
});

// Get current user (protected route)
app.get("/auth/me", { preHandler: authenticate }, async (req, reply) => {
  if (!req.user) {
    reply.code(401).send({ error: 'User not authenticated' });
    return;
  }
  
  const user = users.find(u => u.id === req.user!.userId);
  if (!user) {
    reply.code(404).send({ error: 'User not found' });
    return;
  }
  
  reply.send({
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt,
  });
});

// List users (protected route)
app.get("/users", { preHandler: authenticate }, async (req, reply) => {
  const publicUsers = users.map(user => ({
    id: user.id,
    username: user.username,
    createdAt: user.createdAt,
  }));
  
  reply.send(publicUsers);
});

// Error handling
app.setErrorHandler((error, request, reply) => {
  app.log.error(error);
  
  if (error instanceof z.ZodError) {
    reply.code(400).send({
      error: 'Validation failed',
      details: error.issues,
    });
  } else {
    reply.code(500).send({
      error: isProduction ? 'Internal server error' : error.message,
    });
  }
});

// Start server
app.listen({ 
  port: env.PORT, 
  host: '0.0.0.0' 
}).then(() => {
  console.log(`🚀 API running on port ${env.PORT}`);
  console.log(`📊 Environment: ${env.NODE_ENV}`);
  console.log(`🔒 Security features enabled`);
});