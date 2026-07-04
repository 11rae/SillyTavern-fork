import getRolldownServeMiddleware from '../src/middleware/rolldown-serve.js';

const middleware = getRolldownServeMiddleware();
await middleware.runRolldownCompiler({ forceDist: true });
