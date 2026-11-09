/** Validates request body/query/params with Zod, stores parsed data in request.validated, and returns 422 on failure. */
export function validate(schema, source = "body") {
  return function validateRequest(request, response, next) {
    const result = schema.safeParse(request[source]);
    if (!result.success) {
      return response.status(422).json({ success: false, message: "Request validation failed", errors: result.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) });
    }
    request.validated ??= {};
    request.validated[source] = result.data;
    next();
  };
}
