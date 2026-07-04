// Plugin manager script.
// Usage:
// 1. node plugins.js update
// 2. node plugins.js install <plugin-git-url>
// More operations coming soon.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import isomorphicGit from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import { createGitClient } from './src/git/client.js';
import { color } from './src/util.js';

const __dirname = import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname);
const pluginsPath = './plugins';

const command = process.argv[2];

if (!command) {
    console.log('Usage: node plugins.js <command>');
    console.log('Commands:');
    console.log('  update - Update all installed plugins');
    console.log('  install <plugin-git-url> - Install plugin from a Git URL');
    process.exit(1);
}

if (command === 'update') {
    console.log(color.magenta('Updating all plugins'));
    updatePlugins();
}

if (command === 'install') {
    const pluginName = process.argv[3];
    console.log('Installing a new plugin', color.green(pluginName));
    installPlugin(pluginName);
}

async function updatePlugins() {
    const directories = fs.readdirSync(pluginsPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory() || dirent.isSymbolicLink())
        .filter(dirent => !dirent.name.startsWith('.'))
        .map(dirent => dirent.name);

    console.log(`Found ${color.cyan(directories.length)} directories in ./plugins`);

    for (const directory of directories) {
        try {
            console.log(`Updating plugin ${color.green(directory)}...`);
            const pluginPath = path.join(pluginsPath, directory);

            let isRepo = false;
            try {
                await isomorphicGit.resolveRef({ fs, dir: pluginPath, ref: 'HEAD' });
                isRepo = true;
            } catch {
                // not a git repo
            }
            if (!isRepo) {
                console.log(`Directory ${color.yellow(directory)} is not a Git repository`);
                continue;
            }

            const currentBranch = await isomorphicGit.currentBranch({ fs, dir: pluginPath, fullname: false });
            if (!currentBranch) {
                continue;
            }

            await isomorphicGit.fetch({ fs, http, dir: pluginPath, ref: currentBranch });
            const localHead = await isomorphicGit.resolveRef({ fs, dir: pluginPath, ref: 'HEAD' });
            let remoteHead = localHead;
            try {
                remoteHead = await isomorphicGit.resolveRef({ fs, dir: pluginPath, ref: `refs/remotes/origin/${currentBranch}` });
            } catch {
                // no upstream tracking branch
                console.log(`Plugin ${color.blue(directory)} has no upstream tracking branch`);
                continue;
            }

            if (localHead === remoteHead) {
                console.log(`Plugin ${color.blue(directory)} is already up to date`);
                continue;
            }

            // Fast-forward to remote
            await isomorphicGit.checkout({ fs, dir: pluginPath, ref: remoteHead });
            await fs.promises.writeFile(
                path.join(pluginPath, '.git', 'refs', 'heads', currentBranch),
                remoteHead,
            );
            console.log(`Plugin ${color.green(directory)} updated to commit ${color.cyan(remoteHead.substring(0, 7))}`);
        } catch (error) {
            console.error(color.red(`Failed to update plugin ${directory}: ${error.message}`));
        }
    }

    console.log(color.magenta('All plugins updated!'));
}

async function installPlugin(pluginName) {
    try {
        const pluginPath = path.join(pluginsPath, path.basename(pluginName, '.git'));

        if (fs.existsSync(pluginPath)) {
            return console.log(color.yellow(`Directory already exists at ${pluginPath}`));
        }

        await createGitClient().clone(pluginName, pluginPath, { depth: 1 });
        console.log(`Plugin ${color.green(pluginName)} installed to ${color.cyan(pluginPath)}`);
    } catch (error) {
        console.error(color.red(`Failed to install plugin ${pluginName}`), error);
    }
}
