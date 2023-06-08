const { CoreClass, MessageType } = require("@bot-whatsapp/bot");
const keyPoints = require("./src/keyPoints.json");
const emoji = require("node-emoji");
const emojiRegex = require("emoji-regex");

class chatGPTClass extends CoreClass {
  queue = [];
  optionGPT = { model: "gpt-3.5-turbo" };
  openai = undefined;
  keyPoints = keyPoints;
  awaitingPaymentConfirmation = false;
  awaitingReceipt = false;

  constructor(_database, _provider, _optionsGPT = {}) {
    super(null, _database, _provider);
    this.init().then();
  }

  //? Iniciando...
  init = async () => {
    const { ChatGPTAPI } = await import("chatgpt");
    this.openai = new ChatGPTAPI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  };

  //? Manejo de Mensajes
  handleMsg = async (ctx) => {
    const { from, body, type, hasMedia } = ctx;

    if (this.awaitingPaymentConfirmation) {
      //! El bot está esperando la confirmación de pago

      if (body.toLowerCase() === "comprobante") {
        // El usuario ha enviado un mensaje con la palabra "comprobante"
        // Solicitar el comprobante al usuario

        this.awaitingPaymentConfirmation = false;
        this.awaitingReceipt = true;
        console.log("Se solicita el comprobante de pago");
        this.sendFlowSimple(
          [
            {
              type: MessageType.text,
              body: "Por favor, envía el comprobante de pago.",
            },
          ],
          from
        );
        return;
      }

      // Si el usuario no envía un mensaje con la palabra "comprobante", continúa con la interaciión normal
      this.awaitingPaymentConfirmation = false;
    }

    if (this.awaitingReceipt) {
      //! El bot está esperando el comprobante de pago

      if (type === MessageType.image && hasMedia) {
        // El usuario ha enviado una imagen como comprobante de pago

        this.awaitingReceipt = false;
        console.log("Se recibió un comprobante de pago");
        this.sendFlowSimple(
          [
            {
              type: MessageType.text,
              body: "Gracias por enviar tu comprobante de pago. Procesaré tu solicitud.",
            },
          ],
          from
        );

        return;
      }

      // Si el usuario no envía una imagen como comprobante, continuar con la interacción normal
      this.awaitingReceipt = false;
    }

    // Verificar si es el primer mensaje de la conversación
    const isFirstMessage = this.queue.length === 0;

    // Construir el prompt dinámicamente
    const prompt = this.buildPrompt(body, isFirstMessage);

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
