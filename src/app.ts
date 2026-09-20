import Fastify, { type FastifyInstance } from "fastify";

export function build_app(): FastifyInstance {
  return Fastify({
    logger: false,
  });
}