/** Applied via `tsx --import` so API route tests get stable CSRF/challenge defaults. */
const env = process.env as NodeJS.ProcessEnv & { NODE_ENV?: string };
env.NODE_ENV = "test";
