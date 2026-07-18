import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/response';
import { HTTP_STATUS } from '../constants';

/**
 * Validates req.body/query/params against the given Zod schema AND
 * reassigns the parsed result back onto the request.
 *
 * Previously this middleware called schema.parse() purely to check
 * whether the request WOULD be valid, then discarded the result — the
 * original, unsanitized req.body/query/params continued downstream to
 * the controller. That meant:
 *   1. Zod transforms (e.g. email lowercasing/trimming) never actually
 *      applied to what the controller received.
 *   2. Unrecognized/extra fields in the request body were never stripped
 *      — Zod's default object parsing mode strips unknown keys from its
 *      OUTPUT, but since the output was thrown away, any extra fields an
 *      attacker included in the JSON body survived untouched into
 *      req.body, available for any downstream code that naively spreads
 *      req.body into a database call.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      }) as { body?: unknown; query?: unknown; params?: unknown };

      if (parsed.body   !== undefined) req.body   = parsed.body;
      if (parsed.query  !== undefined) req.query  = parsed.query as typeof req.query;
      if (parsed.params !== undefined) req.params = parsed.params as typeof req.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.slice(1).join('.'), // Remove 'body'/'query'/'params' prefix
          message: e.message,
        }));
        sendError(res, 'Validation failed', HTTP_STATUS.UNPROCESSABLE, errors);
      } else {
        next(error);
      }
    }
  };
}
