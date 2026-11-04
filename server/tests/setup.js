process.env.NODE_ENV = "test";
process.env.JWT_SECRET ||= "test-only-jwt-secret-that-is-longer-than-32-characters";
process.env.JWT_EXPIRES_IN ||= "8h";
process.env.CLIENT_URL ||= "http://localhost:5173";

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
} else {
  delete process.env.DATABASE_URL;
}
