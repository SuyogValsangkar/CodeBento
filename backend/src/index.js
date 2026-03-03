const fastify = require("fastify")();
const cors = require("@fastify/cors");
const { randomUUID } = require("crypto");
const sessions = new Map();
const SESSION_TTL_MS = 2 * 60 * 1000; // 2 minutes
const SESSION_EXPIRED_MESSAGE = "Session has expired or does not exist. Please create a new session.";

// Supported languages for future extension
const supportedLanguages = ["python"];

// Spin runner URL
const RUNNER_URL = process.env.RUNNER_URL || "http://127.0.0.1:3001/execute";
const RUNNER_SESSION_URL = process.env.RUNNER_SESSION_URL || "http://127.0.0.1:3001/execute-session";

// Enable CORS
fastify.register(cors, {
  origin: "http://localhost:5173", // allow your frontend
  methods: ["GET", "POST", "DELETE"],
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

// Helper function to check for expired sessions
function isSessionExpired(session) {
  if (!session) return true;
  const now = Date.now();
  return now - session.lastUsedAt > SESSION_TTL_MS
}

// Endpoint to create a new session
fastify.post("/sessions", async (request, reply) => {
  const { language = "python", notebookId } = request.body || {};

  // Validate language
  if (!supportedLanguages.includes(language)) {
    return reply.status(400).send({
      error: `Unsupported language '${language}'.`,
    });
  }

  // Create session identifier
  const id = randomUUID();
  const now = Date.now();

  // Create session object
  sessions.set(id, {
    id,
    language,
    notebookId: notebookId ?? null,
    sessionState: null,
    createdAt: now,
    lastUsedAt: now,
  });

  return reply.send({ sessionID: id, language });
});

// Execute or resume code in an interactive session
fastify.post("/sessions/:sessionID/execute", async (request, reply) => {
  const { sessionID } = request.params;
  const { sourceCode, stdinChunk, reset = false } = request.body || {};

  const session = sessions.get(sessionID);

  // Validate source code for session execution
  if (typeof sourceCode !== "string" || !sourceCode.trim()) {
    return reply.status(400).send({
      sessionID,
      status: "error",
      stdout: "",
      stderr: "Invalid input. Please provide non-empty source code for the session.",
      prompt: "",
      canContinue: false,
    });
  }

  if (!session || isSessionExpired(session)) {
    if (session) {
      sessions.delete(sessionID);
    }
    return reply.send({
      sessionID,
      status: "expired",
      stdout: "",
      stderr: SESSION_EXPIRED_MESSAGE,
      prompt: "",
      canContinue: false,
    });
  }

  // Optionally reset the session state
  if (reset) {
    session.sessionState = null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(RUNNER_SESSION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceCode: sourceCode ?? null,
        stdinChunk: typeof stdinChunk === "string" ? stdinChunk : "",
        sessionState: session.sessionState ?? {},
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout);

    let data;
    try {
      data = await res.json();
    } catch {
      return reply.send({
        sessionID,
        status: "error",
        stdout: "",
        stderr: "Runner returned a non-JSON response in session mode.",
        prompt: "",
        canContinue: false,
      });
    }

    // If the runner itself throws HTTP exception
    if (!res.ok) {
      return reply.send({
        sessionID,
        status: "error",
        stdout: typeof data.stdout === "string" ? data.stdout : "",
        stderr:
          typeof data.stderr === "string"
            ? data.stderr
            : `Runner HTTP error ${res.status} in session mode.`,
        prompt: "",
        canContinue: false,
      });
    }

    // Create session state object
    const {
      status,
      stdout = "",
      stderr = "",
      prompt = "",
      sessionState: newSessionState = {},
    } = data;
    
    // Update session state and last-used time
    session.sessionState = newSessionState || {};
    session.lastUsedAt = Date.now();
    
    const normalizedStatus = typeof status === "string" ? status : "error";
    const canContinue = normalizedStatus === "waiting_for_input";
    
    // If the session has finished (done or error), remove it
    if (normalizedStatus !== "waiting_for_input") {
      sessions.delete(sessionID);
    }
    
    // Return status of session object
    return reply.send({
      sessionID,
      status: normalizedStatus,
      stdout: typeof stdout === "string" ? stdout : "",
      stderr: typeof stderr === "string" ? stderr : "",
      prompt: typeof prompt === "string" ? prompt : "",
      canContinue,
    });
  } catch (err) {
    clearTimeout(timeout);
    const message =
      err.name === "AbortError"
        ? "Session step timed out after 10 seconds."
        : `Failed to reach session runner: ${err.message}`;

    return reply.send({
      sessionID,
      status: "error",
      stdout: "",
      stderr: message,
      prompt: "",
      canContinue: false,
    });
  }
});

// Endpoint to end a session
fastify.delete("/sessions/:sessionID", async (request, reply) => {
  const { sessionID } = request.params;
  const existed = sessions.delete(sessionID);

  return reply.send({
    sessionID, 
    ok: true,
    deleted: existed,
  });
});

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