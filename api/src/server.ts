import Fastify from "fastify";
import { z } from "zod";
import { env, isProduction } from "./config.js";
import type { User } from "./auth.js";
import { hashPassword, verifyPassword, generateToken, verifyToken } from "./auth.js";
import { createWriteStream, createReadStream } from "fs";
import { promises as fs } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const app = Fastify({
  logger: !isProduction,
});

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadsDir = join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
await fs.mkdir(uploadsDir, { recursive: true });

// Register multipart plugin for file uploads
await app.register(import("@fastify/multipart"), {
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
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

// Music file storage (replace with database in production)
interface MusicFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
}

const musicFiles: MusicFile[] = [];

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

// Upload music file (protected route)
app.post("/upload/music", { preHandler: authenticate }, async (req, reply) => {
  try {
    if (!req.user) {
      reply.code(401).send({ error: 'User not authenticated' });
      return;
    }

    const data = await req.file();
    if (!data) {
      reply.code(400).send({ error: 'No file uploaded' });
      return;
    }

    // Validate file type (audio files only)
    const allowedMimeTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav', 
      'audio/flac',
      'audio/aac',
      'audio/ogg',
      'audio/m4a'
    ];

    if (!allowedMimeTypes.includes(data.mimetype)) {
      reply.code(400).send({ 
        error: 'Invalid file type. Only audio files are allowed.',
        allowedTypes: allowedMimeTypes
      });
      return;
    }

    // Generate unique filename
    const fileId = crypto.randomUUID();
    const fileExtension = extname(data.filename || '');
    const filename = `${fileId}${fileExtension}`;
    const filepath = join(uploadsDir, filename);

    // Save file to disk
    const writeStream = createWriteStream(filepath);
    await data.file.pipe(writeStream);
    
    // Wait for the file to be completely written
    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => resolve());
      writeStream.on('error', reject);
    });

    // Get file stats
    const stats = await fs.stat(filepath);

    // Store file metadata
    const musicFile: MusicFile = {
      id: fileId,
      filename,
      originalName: data.filename || 'unknown',
      mimeType: data.mimetype,
      size: stats.size,
      uploadedBy: req.user.userId,
      uploadedAt: new Date(),
    };

    musicFiles.push(musicFile);

    reply.code(201).send({
      message: 'File uploaded successfully',
      file: {
        id: musicFile.id,
        originalName: musicFile.originalName,
        size: musicFile.size,
        mimeType: musicFile.mimeType,
        uploadedAt: musicFile.uploadedAt,
      },
    });

  } catch (error) {
    app.log.error(error);
    reply.code(500).send({ error: 'File upload failed' });
  }
});

// Get user's uploaded music files (protected route)
app.get("/music/my-files", { preHandler: authenticate }, async (req, reply) => {
  if (!req.user) {
    reply.code(401).send({ error: 'User not authenticated' });
    return;
  }

  const userFiles = musicFiles
    .filter(file => file.uploadedBy === req.user!.userId)
    .map(file => ({
      id: file.id,
      originalName: file.originalName,
      size: file.size,
      mimeType: file.mimeType,
      uploadedAt: file.uploadedAt,
    }));

  reply.send({ files: userFiles });
});

// Get all music files (protected route)
app.get("/music/files", { preHandler: authenticate }, async (req, reply) => {
  const allFiles = musicFiles.map(file => {
    const uploader = users.find(u => u.id === file.uploadedBy);
    return {
      id: file.id,
      originalName: file.originalName,
      size: file.size,
      mimeType: file.mimeType,
      uploadedAt: file.uploadedAt,
      uploadedBy: uploader?.username || 'Unknown',
    };
  });

  reply.send({ files: allFiles });
});

// Stream music file (protected route)
app.get("/music/stream/:fileId", { preHandler: authenticate }, async (req, reply) => {
  try {
    const { fileId } = req.params as { fileId: string };
    
    const musicFile = musicFiles.find(f => f.id === fileId);
    if (!musicFile) {
      reply.code(404).send({ error: 'File not found' });
      return;
    }

    const filepath = join(uploadsDir, musicFile.filename);
    
    // Check if file exists
    try {
      await fs.access(filepath);
    } catch {
      reply.code(404).send({ error: 'File not found on disk' });
      return;
    }

    // Set appropriate headers
    reply.header('Content-Type', musicFile.mimeType);
    reply.header('Content-Disposition', `inline; filename="${musicFile.originalName}"`);
    
    // Stream the file
    const fileStream = createReadStream(filepath);
    return reply.send(fileStream);

  } catch (error) {
    app.log.error(error);
    reply.code(500).send({ error: 'Failed to stream file' });
  }
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