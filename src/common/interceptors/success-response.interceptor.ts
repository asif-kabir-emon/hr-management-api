import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

@Injectable()
export class SuccessResponseInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (
          data &&
          typeof data === "object" &&
          "isSuccess" in (data as Record<string, unknown>)
        ) {
          return data;
        }

        if (data && typeof data === "object" && !Array.isArray(data)) {
          const responseBody = data as Record<string, unknown>;
          const { message, ...rest } = responseBody;

          return {
            isSuccess: true,
            message:
              typeof message === "string" || Array.isArray(message)
                ? message
                : "Request successful",
            data: Object.keys(rest).length > 0 ? rest : null,
          };
        }

        return {
          isSuccess: true,
          message: "Request successful",
          data: data ?? null,
        };
      }),
    );
  }
}
