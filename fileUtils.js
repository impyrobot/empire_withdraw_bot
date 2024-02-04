// fileUtils.js
const fs = require('fs').promises;

async function readAndParseFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return data.split('\n').map(line => line.trim());
    } catch (err) {
        console.error(`Error reading ${filePath}: ${err}`);
        return [];
    }
}

async function readWhitelistFile() {
    return await readAndParseFile('whitelist.txt');
}

async function readBlacklistFile() {
    return await readAndParseFile('blacklist.txt');
}

module.exports = {
    readWhitelistFile,
    readBlacklistFile,
};
