const http = require('http');

const data = JSON.stringify({
  name: "Test Labour",
  fatherName: "Test Father",
  mobile: "1234567890",
  idNumber: "123",
  siteId: null,
  dailyRate: 500,
  status: "Active",
  role: "Labour"
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/labour',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => {
    body += d;
  });
  res.on('end', () => {
    console.log(res.statusCode);
    console.log(body);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
