const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
// const path = require('path');

// Bot tokenini shu yerga yozing
const token = "7594356926:AAFIEh0JWKpGEvBrE89Z29Nzk47IxJ9F-yc";
// Maxsus guruh ID sini shu yerga yozing
const specialGroupId = -1002297654890;
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username;
  const fullName = `${msg.from.first_name} ${msg.from.last_name || ""}`;
  const joinDate = new Date().toISOString();

  // Guruhga xabar yuborish
  bot
    .sendMessage(specialGroupId, `Salom ${username}`)
    .then(() => {
      console.log(chatId, "Xabar muvaffaqiyatli yuborildi!");
    })
    .catch((error) => {
      console.error("Xabar yuborishda xatolik:", error);
    });

  // Bot ishlayotganligini tekshirish uchun (ixtiyoriy)
  bot.on("message", (msg) => {
    console.log("Yangi xabar:", msg.text);
    // Agar chat ID ni bilmoqchi bo‘lsangiz:
    console.log("Chat ID:", msg.chat.id);
  });
});

console.log("Bot ishga tushdi");
