import path from 'node:path';
import { build } from 'rolldown';
import getPublicLibConfig from '../../rolldown.config.js';

export default function getRolldownServeMiddleware() {
    /**
     * @param {import('express').Request} req Request object.
     * @param {import('express').Response} res Response object.
     * @param {import('express').NextFunction} next Next function.
     * @type {import('express').RequestHandler}
     */
    function devMiddleware(req, res, next) {
        const publicLibConfig = getPublicLibConfig();
        const outputDir = publicLibConfig.output?.dir;
        const outputFile = publicLibConfig.output?.entryFileNames;
        const parsedPath = path.parse(req.path);

        if (req.method === 'GET' && parsedPath.dir === '/' && parsedPath.base === outputFile) {
            return res.sendFile(outputFile, { root: outputDir });
        }

        next();
    }

    /**
     * Wait until Rolldown is done compiling.
     * @param {object} param Parameters.
     * @param {boolean} [param.forceDist=false] Whether to force the use the /dist folder.
     * @returns {Promise<void>}
     */
    devMiddleware.runRolldownCompiler = async ({ forceDist = false } = {}) => {
        console.log();
        console.log('Compiling frontend libraries...');

        const publicLibConfig = getPublicLibConfig({ forceDist });
        try {
            await build(publicLibConfig);
        } catch (error) {
            console.warn("Failed to compile frontend libraries. ", error);
            if (globalThis.Deno?.permissions?.revoke) {
                await Deno.permissions.revoke({ name: 'ffi' });
            }
        }

        if (globalThis.Deno?.permissions?.revoke) {
            await Deno.permissions.revoke({ name: 'ffi' });
        }
    };

    return devMiddleware;
}
