const fs = require('fs');
const path = 'client/src/pages/Equipment.tsx';

try {
    const content = fs.readFileSync(path, 'utf8');
    const lines = content.split('\n');

    // Lines to remove: 1363 to 1417 (1-based)
    // Array indices: 1362 to 1416
    // We want to keep 0..1361 and 1417..end

    // Verify the content looks like what we expect
    const startLine = lines[1362];
    if (!startLine.includes('const [createdEquipmentId')) {
        console.error('Line 1363 does not match expectation:', startLine);
        process.exit(1);
    }

    const endLine = lines[1416]; // 1417th line
    if (!endLine.includes('// ... render ...')) {
        console.error('Line 1417 does not match expectation:', endLine);
        // It might be off by one, let's check surrounding
        console.log('Line 1416:', lines[1415]);
        console.log('Line 1418:', lines[1417]);
        process.exit(1);
    }

    const newLines = [
        ...lines.slice(0, 1362),
        ...lines.slice(1417)
    ];

    fs.writeFileSync(path, newLines.join('\n'));
    console.log('Successfully removed lines 1363-1417');
} catch (err) {
    console.error('Error:', err);
    process.exit(1);
}
