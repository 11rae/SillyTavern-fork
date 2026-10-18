import process from 'node:process';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import isDocker from 'is-docker';
import rspack from '@rspack/core';
import { serverDirectory } from './src/server-directory.js';
import { getVersion, color } from './src/util.js';

/**
 * Generate a cache version string based on the application version, Git revision, and Rspack version.
 * @returns {string} The cache version string.
 */
function getRspackCacheVersion() {
    return crypto.createHash('shake256', { outputLength: 8 })
        .update(JSON.stringify([appVersion.pkgVersion, appVersion.gitRevision, rspack.version]))
        .digest('hex');
}

/**
 * Prune old Rspack cache directories that do not match the current cache version.
 * @param {string} rspackRoot The root directory where Rspack caches are stored.
 * @param {string} currentCacheVersion The current cache version to keep.
 */
function pruneRspackCache(rspackRoot, currentCacheVersion) {
    try {
        if (!fs.existsSync(rspackRoot)) {
            return;
        }

        const cacheDirectories = fs.readdirSync(rspackRoot, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        for (const dir of cacheDirectories) {
            const dirPath = path.join(rspackRoot, dir);
            if (dir !== currentCacheVersion) {
                try {
                    fs.rmSync(dirPath, { recursive: true, force: true });
                    console.debug(`Removed outdated cache directory: ${color.yellow(dir)}`);
                } catch (error) {
                    console.error(`Failed to remove Rspack cache directory: ${color.red(dir)}`, error);
                }
            }
        }
    } catch (error) {
        console.error('Failed to read Rspack cache directories for pruning.', error);
    }
}

const appVersion = await getVersion();

/**
 * Get the Rspack configuration for the public/lib.js file.
 * 1. Docker has the cache and the output file pre-baked.
 * 2. Non-Docker environments use the global DATA_ROOT variable to determine the cache and output directories.
 * @param {object} options Configuration options.
 * @param {boolean} [options.forceDist=false] Whether to force the use the /dist folder.
 * @param {boolean} [options.pruneCache=false] Whether to prune old cache directories.
 * @returns {import('rspack').Configuration}
 * @throws {Error} If the DATA_ROOT variable is not set.
 * */
export default function getPublicLibConfig({ forceDist = false, pruneCache = false } = {}) {
    function getRspackRoot() {
        if (forceDist || isDocker()) {
            return path.resolve(process.cwd(), 'dist', '_rspack');
        }

        if (typeof globalThis.DATA_ROOT === 'string') {
            return path.resolve(globalThis.DATA_ROOT, '_rspack');
        }

        throw new Error('DATA_ROOT variable is not set.');
    }

    function getCacheDirectory() {
        return path.join(rspackRoot, cacheVersion, 'cache');
    }

    function getOutputDirectory() {
        return path.join(rspackRoot, cacheVersion, 'output');
    }

    const rspackRoot = getRspackRoot();
    const cacheVersion = getRspackCacheVersion();
    const cacheDirectory = getCacheDirectory();
    const outputDirectory = getOutputDirectory();

    if (pruneCache) {
        pruneRspackCache(rspackRoot, cacheVersion);
    }

    return {
        mode: 'production',
        entry: path.join(serverDirectory, 'public/lib.js'),
        cache: {
            type: 'persistent',
            directory: cacheDirectory,
        },
        devtool: false,
        watch: false,
        module: {},
        stats: {
            preset: 'minimal',
            assets: false,
            modules: false,
            colors: true,
            timings: true,
        },
        performance: {
            hints: false,
        },
        output: {
            path: outputDirectory,
            filename: 'lib.js',
            library: {
                type: 'modern-module',
            },
        },
    };
}
