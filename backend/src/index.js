const fastify = require("fastify")();
const cors = require("@fastify/cors");

// Supported languages for future extension
const supportedLanguages = ["python"];

// Spin runner URL
const RUNNER_URL = process.env.RUNNER_URL || "http://127.0.0.1:3001/execute";

// Enable CORS
fastify.register(cors, {
  origin: "http://localhost:5173", // allow your frontend
  methods: ["GET", "POST"],
});

// Basic route to check if the backend is running
fastify.get("/", async (request, reply) => {
  return { status: "Backend running" };
});

// Start the server
const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    console.log("Backend running on http://localhost:3000");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Endpoint to execute code
fastify.post("/execute", async (request, reply) => {
  const { language, sourceCode, stdin } = request.body;

  // Validate input
  if (!supportedLanguages.includes(language) || !sourceCode) {
    return reply.status(400).send({
      error:
        "Invalid input. Please select a language and provide source code.",
    });
  }

  // Create abort controller and timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  // Call spin runner
  try {
    const res = await fetch(RUNNER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceCode, stdin: typeof stdin === "string" ? stdin : "" }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    // parse JSON response
    let data;
    try {
      data = await res.json();
    } catch {
      return reply.send({
        stdout: "",
        stderr: "Runner returned a non-JSON response",
      });
    }

    // Normalize errors
    if (!res.ok) {
      return reply.send({
        stdout: typeof data.stdout === "string" ? data.stdout : "",
        stderr:
          typeof data.stderr === "string"
            ? data.stderr
            : `Runner HTTP error ${res.status}`,
      });
    }

    // Return result
    return reply.send({
      stdout: typeof data.stdout === "string" ? data.stdout : "",
      stderr: typeof data.stderr === "string" ? data.stderr : "",
    });

  // Catch timeouts and network errors
  } catch (err) {
    const message =
      err.name === "AbortError"
        ? "Execution timed out after 10 seconds"
        : `Failed to reach code runner: ${err.message}`;

    return reply.send({
      stdout: "",
      stderr: message,
    });
  }
});

start();