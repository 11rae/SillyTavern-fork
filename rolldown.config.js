import process from 'node:process';
import path from 'node:path';
import crypto from 'node:crypto';
import isDocker from 'is-docker';
import { VERSION as rolldownVersion } from 'rolldown';
import { serverDirectory } from './src/server-directory.js';
import { getVersion } from './src/util.js';

/**
 * Generate a build version string based on the application version, Git revision, and Rolldown version.
 * Used to namespace the output directory so stale artifacts from older builds are not served.
 * @returns {string} The build version string.
 */
function getRolldownBuildVersion() {
    return crypto.createHash('shake256', { outputLength: 8 })
        .update(JSON.stringify([appVersion.pkgVersion, appVersion.gitRevision, rolldownVersion]))
        .digest('hex');
}

const appVersion = await getVersion();

/**
 * Get the Rolldown configuration for the public/lib.js file.
 * 1. Docker has got the output file pre-baked.
 * 2. Non-Docker environments use the global DATA_ROOT variable to determine the output directory.
 * @param {object} options Configuration options.
 * @param {boolean} [options.forceDist=false] Whether to force the use the /dist folder.
 * @returns {import('rolldown').RolldownOptions}
 * @throws {Error} If the DATA_ROOT variable is not set.
 * */
export default function getPublicLibConfig({ forceDist = false } = {}) {
    function getRolldownRoot() {
        if (forceDist || isDocker()) {
            return path.resolve(process.cwd(), 'dist', '_rolldown');
        }

        if (typeof globalThis.DATA_ROOT === 'string') {
            return path.resolve(globalThis.DATA_ROOT, '_rolldown');
        }

        throw new Error('DATA_ROOT variable is not set.');
    }

    function getOutputDirectory() {
        return path.join(rolldownRoot, buildVersion, 'output');
    }

    const rolldownRoot = getRolldownRoot();
    const buildVersion = getRolldownBuildVersion();
    const outputDirectory = getOutputDirectory();

    return {
        input: path.join(serverDirectory, 'public/lib.js'),
        output: {
            dir: outputDirectory,
            format: 'esm',
            entryFileNames: 'lib.js',
        },
    };
}
