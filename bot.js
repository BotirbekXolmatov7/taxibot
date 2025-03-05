const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const path = require("path");

// Bot tokenini shu yerga yozing
const token = "7594356926:AAFIEh0JWKpGEvBrE89Z29Nzk47IxJ9F-yc";
// Maxsus guruh ID sini shu yerga yozing
const specialGroupId = -1002297654890;
const groupForActivateKod = -1002464720789;
const bot = new TelegramBot(token, { polling: true });

// data.json faylini yaratish va o'qish
const dataFilePath = path.join(__dirname, "data.json");
let data = { users: [], groups: [] };

if (fs.existsSync(dataFilePath)) {
  data = JSON.parse(fs.readFileSync(dataFilePath, "utf8"));
}

// Maxsus kod generatsiya qilish
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Foydalanuvchini tekshirish
function checkUser(userId) {
  return data.users.find((user) => user.id === userId);
}

// data.json faylini yangilash
function updateDataFile() {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), "utf8");
}

// Botga start bosganda
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username;
  const fullName = `${msg.from.first_name} ${msg.from.last_name || ""}`;
  const joinDate = new Date().toISOString();

  const user = checkUser(userId);

  if (!user) {
    const code = generateCode();
    data.users.push({ id: userId, username, fullName, joinDate, code, verified: false });
    updateDataFile();

    bot.sendMessage(
      groupForActivateKod,
      `Ismi: ${fullName} \nKodi: ${code}`
    );
  } else {
    bot.sendMessage(chatId, `Siz allaqachon ro'yxatdan o'tgansiz.`);
  }
});

// Kodni tekshirish
bot.onText(/(\d{6})/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const code = match[1];

  const user = checkUser(userId);

  if (user && user.code === code) {
    bot.sendMessage(
      chatId,
      `Kod to'g'ri. Endi siz botdan foydalanishingiz mumkin.`
    );
    user.verified = true;
    updateDataFile();
  } else {
    bot.sendMessage(chatId, `Kod noto'g'ri. Iltimos, qaytadan urinib ko'ring.`);
  }
});

// Xabar yuborish
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const user = checkUser(userId);

  if (user && user.verified) {
    data.groups.forEach((group) => {
      bot.sendMessage(group.id, msg.text);
    });
  }  else {
    bot.sendMessage(
        chatId,
        `Sizga xabar yuborish uchun ruxsat yo'q. Iltimos, kodni kiriting.`
      );
  }
});

// Guruhga qo'shilganda
bot.on("new_chat_members", (msg) => {
  const chatId = msg.chat.id;
  const chatTitle = msg.chat.title;

  // Guruh ma'lumotlarini maxsus guruhga yuborish
  const groupInfo = `Yangi guruh qo'shildi:\nGuruh nomi: ${chatTitle}\nGuruh ID: ${chatId}`;
  bot.sendMessage(specialGroupId, groupInfo);

  if (!data.groups.find((group) => group.id === chatId)) {
    data.groups.push({ id: chatId, title: chatTitle });
    updateDataFile();
  }
});


// 24 soatda bir foydalanuvchilarni tekshirish
setInterval(() => {
  const now = new Date();
  data.users = data.users.filter((user) => {
    const joinDate = new Date(user.joinDate);
    const daysSinceJoin = (now - joinDate) / (1000 * 60 * 60 * 24);
    return daysSinceJoin <= 30;
  });
  updateDataFile();
}, 24 * 60 * 60 * 1000);

console.log("bot ishga tushdi");
