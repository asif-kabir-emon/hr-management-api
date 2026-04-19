import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message: string | string[] = "Internal server error";
    let errors: unknown = undefined;

    if (typeof exceptionResponse === "string") {
      message = exceptionResponse;
    } else if (
      exceptionResponse &&
      typeof exceptionResponse === "object"
    ) {
      const responseBody = exceptionResponse as Record<string, unknown>;
      message =
        (responseBody.message as string | string[] | undefined) ??
        (responseBody.error as string | undefined) ??
        message;
      errors = responseBody;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    response.status(status).json({
      isSuccess: false,
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      message,
      errors,
    });
  }
}
