const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");

const bot = new TelegramBot('6054730659:AAGPUhfXT-nIdvrTwvmheNHsULaS9o9Itzo', { polling: true });
const adminChatID = "1425448286";
const usersAwaitingUsername = {};

bot.on("message", async (msg) => {
  try {
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    const userMessage = msg.caption || msg.text || "";

    // Сохраняем текст сообщения пользователя и запрашиваем медиа
    if (userMessage && !usersAwaitingUsername[userId]) {
      // Проверяем, что сообщение пользователя не является командой "/start"
      if (userMessage !== "/start") {
        usersAwaitingUsername[userId] = { stage: "media", text: userMessage };
        await bot.sendMessage(
          chatId,
          "Пришлите мне фото или видео вместе с вашим описанием: " + userMessage
        );
      } else {
        await bot.sendMessage(
          chatId,
          "Привет! Здесь ты можешь предложить свою новость , и возможно мы ее выложим."
        );
      }
    }
  } catch (error) {
    console.error("Ошибка в обработчике сообщений:", error);
  }
});

bot.on("photo", async (msg) => {
  try {
    const userId = msg.from.id;
    const userRecord = usersAwaitingUsername[userId];

    if (userRecord && userRecord.stage === "media") {
      const photoFileId = msg.photo[msg.photo.length - 1].file_id;
      userRecord.media = [{ type: "photo", media: photoFileId }];
      await sendToAdmin(userId, userRecord.text, userRecord.media);
    }
  } catch (error) {
    console.error("Ошибка в обработчике фото:", error);
  }
});

bot.on("video", async (msg) => {
  try {
    const userId = msg.from.id;
    const userRecord = usersAwaitingUsername[userId];

    if (userRecord && userRecord.stage === "media") {
      const videoFileId = msg.video.file_id;
      userRecord.media = [{ type: "video", media: videoFileId }];
      await sendToAdmin(userId, userRecord.text, userRecord.media);
    }
  } catch (error) {
    console.error("Ошибка в обработчике видео:", error);
  }
});

async function sendToAdmin(userId, text, media) {
  try {
    const adminMessage = `Получена новая заявка от пользователя @${userId}:\n${text}`;
    const mediaToSend = media.map((item) => ({
      type: item.type,
      media: item.media,
    }));
    await bot.sendMediaGroup(adminChatID, mediaToSend);
    await bot.sendMessage(adminChatID, adminMessage);
    delete usersAwaitingUsername[userId];
  } catch (error) {
    console.error("Ошибка при отправке сообщения админу:", error);
  }
}

bot.on("callback_query", async (msg) => {
  const secondChannel = "-1002056424069";
  const userId = msg.message.from.id;

  if (msg.data === 'accept') {
    try {
      // Находим запись пользователя по его идентификатору
      const userRecord = userRecords.find((record) => record.user_id === userId);

      if (userRecord) {
        // Создаем массив для медиа
        const mediaToSend = [];

        // Добавляем текст, если он присутствует
        if (userRecord.text) {
          mediaToSend.push({ type: 'text', content: userRecord.text });
        }

        // Добавляем фотографии
        if (userRecord.media) {
          for (const mediaItem of userRecord.media) {
            if (mediaItem.type === 'photo') {
              mediaToSend.push({ type: 'photo', media: mediaItem.media });
            } else if (mediaItem.type === 'video') {
              mediaToSend.push({ type: 'video', media: mediaItem.media });
            }
          }
        }
      } else {
        console.error("Запись пользователя не найдена.");
        // Опционально: отправляем уведомление о проблеме пользователю
        await bot.sendMessage(userId, "Произошла ошибка при обработке вашей заявки. Пожалуйста, попробуйте позже.");
      }
    } catch (error) {
      console.error("Ошибка при обработке колбэка accept:", error);
    }
  } else if (msg.data === 'decline') {
    await bot.deleteMessage(msg.message.chat.id, msg.message.message_id);
  }
});

bot.on("polling_error", console.error);
