const express = require('express');
const dotenv = require('dotenv')

dotenv.config();
const app = express();

app.get('/', (req, res) => {
    res.send('esta es la api por defecto');
});

app.get('/version', (req, res) => {
    res.send('1.1.1');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});