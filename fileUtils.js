// fileUtils.js
const fs = require('fs').promises;

// Function to read and parse a file, returning an array of trimmed lines
function readFileAndParse(filePath, callback) {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error reading the file from ${filePath}:`, err);
            callback(err, null);
            return;
        }
        const lines = data.split('\n').map(line => line.trim());
        callback(null, lines);
    });
}

module.exports = {
    readFileAndParse
};