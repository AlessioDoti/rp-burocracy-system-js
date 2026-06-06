// Jest setup — sets sane test env defaults before any application module
// is imported. Mirrors the shape of .env.example but never touches a real DB.
process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3306';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_NAME = 'test';
process.env.DB_CONNECTION_LIMIT = '2';
process.env.LOG_LEVEL = 'fatal';
