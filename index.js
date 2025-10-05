// backend/index.js
const express = require('express');
const cors = require('cors');
const botsRouter = require('./routes/bots');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/bots', botsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

// backend/routes/bots.js
const express = require('express');
const router = express.Router();
const { launchBot } = require('../controllers/botController');

router.post('/launch', launchBot);

module.exports = router;

// backend/controllers/botController.js
const { spawnBot } = require('../utils/launcher');

exports.launchBot = async (req, res) => {
  const { token, streamUrl, botName } = req.body;

  if (!token || !streamUrl || !botName) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  try {
    await spawnBot({ token, streamUrl, botName });
    res.status(200).json({ message: 'Bot lanzado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al lanzar el bot' });
  }
};

// backend/utils/launcher.js
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

exports.spawnBot = ({ token, streamUrl, botName }) => {
  return new Promise((resolve, reject) => {
    const botCode = `
      const { Client } = require('discord.js');
      const { spawn } = require('child_process');
      const client = new Client({ intents: [32767] });

      client.on('ready', () => {
        console.log('Bot listo: ${botName}');
        const ffmpeg = spawn('ffmpeg', [
          '-reconnect', '1',
          '-reconnect_streamed', '1',
          '-reconnect_delay_max', '5',
          '-i', '${streamUrl}',
          '-f', 's16le',
          '-ar', '48000',
          '-ac', '2',
          'pipe:1'
        ]);
        // Aquí iría la lógica de conexión a un canal de voz
      });

      client.login('${token}');
    `;

    const botPath = path.join(__dirname, `${botName}.js`);
    fs.writeFileSync(botPath, botCode);

    exec(`pm2 start ${botPath} --name "${botName}"`, (err, stdout, stderr) => {
      if (err) return reject(err);
      console.log(stdout);
      resolve();
    });
  });
};