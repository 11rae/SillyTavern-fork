import getRspackServeMiddleware from '../src/middleware/rspack-serve.js';

const middleware = getRspackServeMiddleware();
await middleware.runRspackCompiler({ forceDist: true });
