/** Returns middleware that allows only the supplied trusted role names and otherwise responds with 403. */
export function authorize(...allowedRoles) {
  return function enforceRole(request, response, next) {
    if (!request.user) return response.status(401).json({ success: false, message: "Authentication required" });
    if (!allowedRoles.includes(request.user.role)) return response.status(403).json({ success: false, message: "You do not have permission to perform this action" });
    next();
  };
}
