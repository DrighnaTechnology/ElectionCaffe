const express = require('express');
const path = require('path');

const app = express();
const PORT = 5000;
const HOST = '0.0.0.0';

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`ElectionCaffe server running at http://${HOST}:${PORT}`);
});
