const express = require('express');
const app = express();

app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

app.get('/', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'Server is running'
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
