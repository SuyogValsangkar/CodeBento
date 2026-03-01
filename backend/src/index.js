const fastify = require("fastify")();
const { spawn } = require("child_process");
const path = require("path");
const cors = require("@fastify/cors");

// Supported languages for future extension
const supportedLanguages = ["python"];

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
  const { language, sourceCode } = request.body;

  // Validate input
  if (!supportedLanguages.includes(language) || !sourceCode) {
    return reply
      .status(400)
      .send({
        error: "Invalid input. Please select a language and provide source code.",
      });
  }

  // Absolute path to runner folder
  const runnerPath = path.join(__dirname, "../../runner");

  // Spawn the runner process
  return new Promise((resolve) => {
    const runner = spawn("cargo", ["run"], { cwd: runnerPath });

    // Optional: timeout (10s for example)
    const timeout = setTimeout(() => {
      runner.kill();
      resolve(
        reply.send({
          stdout: "",
          stderr: "Execution timed out after 10 seconds",
        })
      );
    }, 10000);

    let stdout = "";
    let stderr = "";

    runner.stdout.on("data", (data) => {
      stdout += data;
    });

    runner.stderr.on("data", (data) => {
      stderr += data;
    });

    runner.on("close", () => {
      clearTimeout(timeout);

      // Parse runner output as JSON
      let result;
      try {
        result = JSON.parse(stdout);
      } catch {
        result = {
          stdout: "",
          stderr: `Runner output parse error. Raw stderr: ${stderr}`,
        };
      }

      resolve(reply.send(result));
    });

    // Send code to runner stdin
    runner.stdin.write(sourceCode);
    runner.stdin.end();
  });
});

start();