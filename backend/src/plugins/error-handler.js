import fp from 'fastify-plugin';

async function errorHandler(fastify) {
  fastify.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode || 500;

    // Prisma known errors
    if (error.code === 'P2002') {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Dữ liệu đã tồn tại',
          details: error.meta?.target || [],
        },
      });
    }

    if (error.code === 'P2025') {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Không tìm thấy dữ liệu',
        },
      });
    }

    // Fastify validation error
    if (error.validation) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dữ liệu không hợp lệ',
          details: error.validation.map((v) => ({
            field: v.instancePath?.replace('/', '') || v.params?.missingProperty,
            message: v.message,
          })),
        },
      });
    }

    // Log unexpected errors
    if (statusCode >= 500) {
      fastify.log.error(error);
    }

    reply.status(statusCode).send({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message:
          statusCode >= 500 ? 'Lỗi server. Vui lòng thử lại sau.' : error.message,
      },
    });
  });
}

export default fp(errorHandler, { name: 'error-handler' });
