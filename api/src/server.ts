import Fastify from "fastify";
import { z } from "zod";

const app = Fastify();

// root
app.get("/", async () => ({ message: "Welcome to the API", version: "1.0.0" }));

// health
app.get("/health", async () => ({ ok: true }));

// in-memory demo store
type User = { id: string; username: string };
const users: User[] = [];

// create user
app.post("/users", async (req, reply) => {
  const Body = z.object({ username: z.string().min(3) });
  const { username } = Body.parse(req.body);
  const u = { id: crypto.randomUUID(), username };
  users.push(u);
  reply.code(201).send(u);
});

// list users
app.get("/users", async () => users);

app.listen({ port: 3001 }).then(() => console.log("API on :3001"));