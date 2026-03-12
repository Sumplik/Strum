const response = await fetch('http://localhost:3001/api/test/websocket', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ device_id: 'TEST-001', status: 'on_duty' })
});
const data = await response.json();
console.log(JSON.stringify(data, null, 2));

