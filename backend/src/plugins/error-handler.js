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
      const translateAjvMessage = (msg) => {
        if (!msg) return 'không hợp lệ';
        if (msg.includes('must be string')) return 'phải là chuỗi';
        if (msg.includes('must be number')) return 'phải là số';
        if (msg.includes('must be integer')) return 'phải là số nguyên';
        if (msg.includes('must be boolean')) return 'phải là boolean';
        if (msg.includes('must be object')) return 'phải là đối tượng';
        if (msg.includes('must be array')) return 'phải là mảng';
        if (msg.includes('is required') || msg.includes('must have required property')) return 'là bắt buộc';
        if (msg.includes('must NOT have fewer than')) return msg.replace('must NOT have fewer than', 'không được ít hơn').replace('characters', 'ký tự');
        if (msg.includes('must NOT have more than')) return msg.replace('must NOT have more than', 'không được nhiều hơn').replace('characters', 'ký tự');
        if (msg.includes('must match pattern') || msg.includes('must match format')) return 'không đúng định dạng';
        if (msg.includes('must be >=')) return msg.replace('must be >=', 'phải lớn hơn hoặc bằng');
        if (msg.includes('must be <=')) return msg.replace('must be <=', 'phải nhỏ hơn hoặc bằng');
        if (msg.includes('must be >')) return msg.replace('must be >', 'phải lớn hơn');
        if (msg.includes('must be <')) return msg.replace('must be <', 'phải nhỏ hơn');
        if (msg.includes('must be equal to constant')) return 'không hợp lệ';
        return msg;
      };

      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dữ liệu không hợp lệ',
          details: error.validation.map((v) => ({
            field: v.instancePath?.replace('/', '') || v.params?.missingProperty,
            message: translateAjvMessage(v.message),
          })),
        },
      });
    }

    // Log unexpected errors
    if (statusCode >= 500) {
      fastify.log.error(error);
    }

    let finalMessage = statusCode >= 500 ? 'Lỗi server. Vui lòng thử lại sau.' : error.message;

    // Translate common Fastify/Node errors to Vietnamese
    if (finalMessage) {
      if (finalMessage.includes('Not Found') || finalMessage.includes('not found')) {
        finalMessage = 'Không tìm thấy dữ liệu hoặc đường dẫn';
      } else if (finalMessage.includes('Unauthorized') || finalMessage === 'Unauthorized') {
        finalMessage = 'Không có quyền truy cập';
      } else if (finalMessage.includes('Forbidden') || finalMessage === 'Forbidden') {
        finalMessage = 'Truy cập bị từ chối';
      } else if (finalMessage.includes('Bad Request')) {
        finalMessage = 'Yêu cầu không hợp lệ';
      } else if (finalMessage.includes('Invalid') || finalMessage.includes('invalid')) {
        finalMessage = 'Dữ liệu không hợp lệ';
      }
    }

    reply.status(statusCode).send({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: finalMessage,
      },
    });
  });
}

export default fp(errorHandler, { name: 'error-handler' });
