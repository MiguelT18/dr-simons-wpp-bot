require('dotenv').config();

const { createProvider } = require('@bot-whatsapp/bot');

const QRPortalWeb = require('@bot-whatsapp/portal');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const JsonFileAdapter = require('@bot-whatsapp/database/json');

const chatGPTClass = require('./chatgpt.class.js');

const createBotGPT = async ({ provider, database }) => {
  return new chatGPTClass(database, provider);
};

const main = async () => {
  const adapterDB = new JsonFileAdapter();
  const adapterProvider = createProvider(BaileysProvider);

  // Crear instancia del bot con la configuración de OpenAI
  createBotGPT({
    provider: adapterProvider,
    database: adapterDB,
  })
  
  QRPortalWeb();
};

main();