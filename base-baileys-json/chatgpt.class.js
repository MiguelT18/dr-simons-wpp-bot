const { CoreClass, MessageType } = require("@bot-whatsapp/bot");
const keyPoints = require("./keyPoints.json");
const emoji = require("node-emoji");
const emojiRegex = require("emoji-regex");

class chatGPTClass extends CoreClass {
  queue = [];
  optionGPT = { model: "gpt-3.5-turbo" };
  openai = undefined;
  keyPoints = keyPoints;
  awaitingPaymentConfirmation = false;
  awaitingReceipt = false;
  userMessages = [];
  timer = null;

  constructor(_database, _provider, _optionsGPT = {}) {
    super(null, _database, _provider);
    this.init().then();
  }

  //? Iniciando...
  init = async () => {
    const { ChatGPTAPI } = await import("chatgpt");

    if (!process.env.OPENAI_API_KEY) {
      //! Error al buscar la clave api
      console.log(
        "No se encontró la clave API de OpenAI. Asegúrate de que esté configurada correctamente"
      );
      return;
    }

    this.openai = new ChatGPTAPI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  };

  //? Manejo de Mensajes
  handleMsg = async (ctx) => {
    const { from, body } = ctx;

    // Agrega el mensaje a la lista de mensajes del usuario
    this.userMessages.push(body);

    // Si ya hay un temporizador en marcha lo cancela
    if (this.timer) {
      clearTimeout(this.timer);
    }

    // Inicia un nuevo temporizador
    this.timer = setTimeout(() => {
      // Cuando el temporizador se agota, procesa todos los mensajes del usuario
      this.processMessages(from);
    }, 10000);
  };

  processMessages = async (from) => {
    // Une todos los mensajes del usuario con un salto de línea entre ellos
    let fullMessage = this.userMessages.join("\n");

    // Limpia la lista de mensajes del usuario
    this.userMessages = [];

    // Verificar si es el primer mensaje de la conversación
    const isFirstMessage = this.queue.length === 0;

    // Construir el prompt dinámicamente
    const prompt = this.buildPrompt(fullMessage, isFirstMessage);

    //! Manejo de errores para la llamada a this.openai.sendMessage
    try {
      const completion = await this.openai.sendMessage(prompt, {
        conversationId: !this.queue.length
          ? undefined
          : this.queue[this.queue.length - 1].conversationId,
        parentMessageId: !this.queue.length
          ? undefined
          : this.queue[this.queue.length - 1].id,
      });

      this.queue.push(completion);

      // No incluir los keyPoints en la respuesta final
      const parseMessage = {
        ...completion,
        answer: this.addEmojis(completion.text),
      };

      // Si la respuesta incluye un enlace, extraerlo y agregarlo a los keyPoints
      if (parseMessage.answer.includes("http")) {
        const link = parseMessage.answer.match(/(http[s]?:\/\/[^\s]+)/g);
        this.keyPoints += `\n\nEnlace para consulta en línea: ${link}`;

        // Avisar en la consola antes de enviar el enlace
        console.log(`Se enviará el siguiente enlace: ${link}`);
      }

      // Enviar la respusta al usuario
      this.sendFlowSimple([parseMessage], from);
    } catch (error) {
      console.log("Hubo un error al llamar a la API de OpenAI: ", error);
    }
  };

  //? BUILDPROMPT
  buildPrompt = (userMessage, isFirstMessage) => {
    let formattedKeyPoints = "";
    if (Array.isArray(this.keyPoints)) {
      formattedKeyPoints = this.keyPoints
        .map((keyPoint) => this.addEmojis(keyPoint))
        .join("\n");
    }

    let prompt = userMessage;
    if (isFirstMessage) {
      const greeting =
        "¡Hola! Como asistente AI al servicio del Dr.Cristian Simons, tu misión es manejar consultas sobre programación de citas, pagos, procedimientos quirúrgicos y dudas en general en el contexto de la consulta médica en línea.";
      prompt = `${greeting}\n${formattedKeyPoints}\n${userMessage}`;
    } else {
      prompt = `${formattedKeyPoints}\n${userMessage}`;
    }

    return prompt.trim();
  };

  addEmojis = (text) => {
    const regex = emojiRegex();
    return emoji.emojify(text.replace(regex, (match) => match));
  };

  updateKeyPoints = (newPoint) => {
    this.keyPoints.push(newPoint);
  };
}

module.exports = chatGPTClass;
