import fastify, { type FastifyInstance } from "fastify";

export function build_app(): FastifyInstance {
  return fastify({
    logger: false,
  });
}
