const fastify = require("fastify")();

fastify.get("/", async (request, reply) => {
  return { status: "Backend running" };
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    console.log("Backend running on http://localhost:3000");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();