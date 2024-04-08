const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");

const bot = new TelegramBot('6054730659:AAGPUhfXT-nIdvrTwvmheNHsULaS9o9Itzo', { polling: true });
const jsonFilePath = require("./requests.json");

let userRecords = [];
let usersAwaitingUsername = {};


const adminChatID = "1425448286";
bot.on("message", async (msg) => {
    try {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const userMessage = msg.text;
  
      if (usersAwaitingUsername[userId]) {
        const stage = usersAwaitingUsername[userId].stage;
  
        if (stage === "description") {
          usersAwaitingUsername[userId].description = userMessage;
          usersAwaitingUsername[userId].stage = "media";
  
          await bot.sendMessage(
            chatId,
            "Теперь пришлите мне фото или видео вместе с вашим описанием: " + userMessage
          );
        } else if (stage === "media") {
          if (!usersAwaitingUsername[userId].media) {
            usersAwaitingUsername[userId].media = [];
          }
  
          if (msg.photo) {
            const photoFileId = msg.photo[msg.photo.length - 1].file_id;
            usersAwaitingUsername[userId].media.push({ type: "photo", media: photoFileId });
          }
  
          if (msg.video) {
            const videoFileId = msg.video.file_id;
            usersAwaitingUsername[userId].media.push({ type: "video", media: videoFileId });
          }

          if (msg.text) {
            usersAwaitingUsername[userId].text = msg.text;
          }
  
          const newUserRecord = {
            user_id: userId,
            description: usersAwaitingUsername[userId].description,
            media: usersAwaitingUsername[userId].media,
            text: usersAwaitingUsername[userId].text || "",
          };
  
          userRecords.push(newUserRecord);
          fs.writeFileSync('./requests.json', JSON.stringify(userRecords, null, "\t"));
  
          // Отправляем администратору информацию о новой заявке вместе с медиа и текстом
          const adminMessage = `Получена новая заявка от пользователя @${msg.from.username} (${msg.from.first_name} ${msg.from.last_name}):\n${msg.text || ''}`;
          const media = usersAwaitingUsername[userId].media || [];
          const mediaToSend = media.map(item => item.type === 'photo' ? { type: 'photo', media: item.media } : { type: 'video', media: item.media });
  
          // Добавляем кнопки для администратора
          const keyboard = {
            inline_keyboard: [
              [
                { text: "Принять", callback_data: "accept" },
                { text: "Отклонить", callback_data: "decline" },
              ],
            ],
          };
  
          await bot.sendMediaGroup(adminChatID, mediaToSend);
          await bot.sendMessage(adminChatID, adminMessage, { reply_markup: keyboard });
  
          await bot.sendMessage(chatId, "Медиа и текст добавлены.");
  
          delete usersAwaitingUsername[userId];
        }
      } else {
        const user = userRecords.find((x) => x.username === userMessage);
  
        if (user) {
          await bot.sendMessage(chatId, "Этот пользователь уже добавлен");
        } else if (userMessage === "/start") {
          usersAwaitingUsername[userId] = { stage: "description" };
          await bot.sendMessage(
            chatId,
            "Пожалуйста, пришлите мне описание."
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
    const userRecord = userRecords.find((record) => record.user_id === userId);

    if (userRecord) {
      userRecord.media = userRecord.media || [];

      const photoFileId = msg.photo[msg.photo.length - 1].file_id;
      userRecord.media.push({ type: "photo", media: photoFileId });

      fs.writeFileSync('./requests.json', JSON.stringify(userRecords, null, "\t"));

      await bot.sendMessage(
        msg.chat.id,
        "Фотография добавлена. Чтобы завершить отправку, пришлите описание или еще одно фото или видео."
      );
    }
  } catch (error) {
    console.error("Ошибка в обработчике фото:", error);
  }
});

bot.on("video", async (msg) => {
  try {
    const userId = msg.from.id;
    const userRecord = jsonFilePath.find((record) => record.user_id === userId);

    if (userRecord) {
      userRecord.media = userRecord.media || [];

      const videoFileId = msg.video.file_id;
      userRecord.media.push({ type: "video", media: videoFileId });

      fs.writeFileSync('./requests.json', JSON.stringify(userRecords, null, "\t"));

      await bot.sendMessage(
        msg.chat.id,
        "Видео добавлено. Чтобы завершить отправку, пришлите описание или еще одно фото или видео."
      );
    }
  } catch (error) {
    console.error("Ошибка в обработчике видео:", error);
  }
});
bot.on("message", async (msg) => {
  try {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const username = msg.from.username;
      const userMessage = msg.text;

      // Добавляем информацию о пользователе при получении заявки
      if (!userRecords.some(record => record.user_id === userId)) {
          userRecords.push({ user_id: userId, username: username });
      }

      // Обработка сообщения
      // ...
  } catch (error) {
      console.error("Ошибка в обработчике сообщений:", error);
  }
});

bot.on("callback_query", async (msg) => {
  const secondChannel = "-1002056424069";
  const userId = msg.message.from.id;

  if (msg.data === 'accept'){
    await bot.forwardMessage(secondChannel, msg.message.from.id, msg.message.message_id);
  }else if(msg.data === 'decline'){
    await bot.deleteMessage(msg.message.from.username, msg.message.message_id)
  }
});




bot.on("polling_error", console.error);
