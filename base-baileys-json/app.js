require("dotenv").config();

const { createProvider } = require("@bot-whatsapp/bot");

const QRPortalWeb = require("@bot-whatsapp/portal");
const WhatsAppWebProvider = require("@bot-whatsapp/provider/web-whatsapp");
const JsonFileAdapter = require("@bot-whatsapp/database/json");

const chatGPTClass = require("./chatgpt.class.js");

const createBotGPT = async ({ provider, database }) => {
  return new chatGPTClass(database, provider);
};

const main = async () => {
  try {
    const adapterDB = new JsonFileAdapter();
    const adapterProvider = createProvider(WhatsAppWebProvider);

    // Crear instancia del bot con la configuración de OpenAI
    createBotGPT({
      provider: adapterProvider,
      database: adapterDB,
    });

    QRPortalWeb();
  } catch (error) {
    console.log("Hubo un error al ejecutar el bot: ", error);
  }
};

main();
