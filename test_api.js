async function test() {
    try {
        // 1. Login
        const loginRes = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@texmaintain.com', password: 'admin123' })
        });

        if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
        const loginData = await loginRes.json();
        const token = loginData.accessToken;
        console.log('Got token');

        // 2. Get list
        const listRes = await fetch('http://localhost:3000/api/process-area', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const listData = await listRes.json();
        console.log('List Data:', JSON.stringify(listData, null, 2));

        if (!listData.productionLines || listData.productionLines.length === 0) {
            console.log('No process areas found');
            return;
        }

        const lineId = listData.productionLines[0]._id;
        console.log(`Testing with Line ID: ${lineId}`);

        // 3. Get details
        const detailRes = await fetch(`http://localhost:3000/api/process-area/${lineId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const detailData = await detailRes.json();
        const line = detailData.productionLine;

        console.log(`Line Name: ${line.name}`);

        if (line.departments) {
            line.departments.forEach(department => {
                console.log(`\nDepartment: ${department.departmentId.name}`);
                if (department.departmentId.asset) {
                    department.departmentId.asset.forEach(item => {
                        console.log(`  - Asset ID: ${item.assetId._id}`);
                        console.log(`    Name: ${item.assetId.name}`);
                        console.log(`    Model: ${item.assetId.model}`);
                        // Check if type is populated
                        console.log(`    Type: ${item.assetId.type ? (item.assetId.type.name || 'Type Name Missing') : 'Type Missing'}`);
                        console.log(`    Full Object:`, JSON.stringify(item.assetId, null, 2));
                    });
                }
            });
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

test();
