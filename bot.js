const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const path = require("path");
const winston = require("winston");

// Bot tokenini shu yerga yozing
const token = "7594356926:AAFIEh0JWKpGEvBrE89Z29Nzk47IxJ9F-yc"; // taxirekbot
const bot = new TelegramBot(token, { polling: true });
// Maxsus guruh ID sini shu yerga yozing
const specialGroupId = -1002297654890;
const groupForActivateKod = -1002464720789;
const specialGroupIda = -1002471884272;
// vareables
let processType = "";
let statusType = "user";
let callbackQuaryType = "";
let currentUserCode = "";

// data.json faylini yaratish va o'qish
const dataFilePath = path.join(__dirname, "data.json");
let data = { users: [], groups: [] };
// Log fayli saqlanadigan joy
const logFilePath = path.join(__dirname, "app.log");

// Winston logger yaratamiz
const logger = winston.createLogger({
  level: "info", // Log darajasi (info, warn, error)
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: logFilePath }), // Faylga yozish
  ],
});

// // Misol uchun log yozamiz
// logger.info("Bot ishga tushdi");
// logger.warn("Ogohlantirish: Tarmoq ulanishi sust!");
// logger.error("Xatolik: Ma'lumotlar bazasiga ulanib bo‘lmadi!");

if (fs.existsSync(dataFilePath)) {
  data = JSON.parse(fs.readFileSync(dataFilePath, "utf8"));
}

// Maxsus kod generatsiya qilish
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
  logger.info("Bot ishga tushdi");
}

// Foydalanuvchini tekshirish
function checkUser(userId) {
  return data.users.find((user) => user.id === userId);
}

function findUserByActivationCode(users, code) {
  return users.find((user) => user.activationCode == code);
}
function statusManager(users, code, prmsType, chatId, text, status) {
  users.forEach((element, index) => {
    if (element.activationCode == code) {
      data.users[index].permissions[prmsType] = status === "add" ? true : false;
      data.users[index].joinDate = new Date();
      bot.sendMessage(chatId, text + `${status === "add" ? " ✅" : " ❌"}`);
    }
  });
  updateDataFile();
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
  const code = generateCode();
  const user = checkUser(userId);
  if (!user) {
    data.users.push({
      id: userId,
      username,
      fullName,
      joinDate,
      activationCode: code,
      permissions: {
        isAdmin: false,
        sendMessage: false,
        addAdmin: false,
      },
    });
    updateDataFile();

    bot.sendMessage(
      chatId,
      `Assalomu alaykum: ${fullName}.
       Sizda botdan ro'yxatdan o'tdingiz.\n
       Sizning activlashtirish ko'dingiz: ${code},\n 
       lekin botga habar yuborish uchun sizni botga qo'shmoqchi bo'lgan adminga \n ID raqamingizni yuboring`
    );
  } else {
    bot.sendMessage(chatId, `Siz allaqachon ro'yxatdan o'tgansiz.`);
  }
});

// Xabarlarni qabul qilish
bot.on("message", async (msg) => {
  const userId = msg.from.id;
  const text = msg.text;
  try {
    // Foydalanuvchini tekshirish (asinxron tarzda)
    const user = await checkUser(userId);

    // 1️⃣ Agar xabarni bot o‘zi yozgan bo‘lsa, uni qayta yubormaslik
    if (msg.from.is_bot) {
      return; // Xech narsa qilmaymiz
    }

    // 2️⃣ Agar xabar guruhdan kelgan bo‘lsa, bot uni qayta yubormasin
    if (msg.chat.type === "supergroup" || msg.chat.type === "group") {
      logger.info("habar guruhdan keldi");
      return;
    }

    // Agar foydalanuvchi topilmasa yoki ruxsatlar mavjud bo'lmasa
    if (!user) {
      await bot.sendMessage(
        userId,
        "Foydalanuvchi topilmadi. Iltimos, qayta urinib ko'ring."
      );
      return;
    }

    // Agar /start yoki /admin buyruqlari bo'lmasa va foydalanuvchi "user" rejimida bo'lsa
    if (text !== "/start" && text !== "/admin" && statusType === "user") {
      // Foydalanuvchida xabar yuborish ruxsati borligini tekshirish
      if (user.permissions.sendMessage) {
        // Guruhlarga xabar yuborish (asinxron tarzda)
        data.groups.forEach(async (group) => {
          try {
            await bot.sendMessage(group.id, msg.text);
          } catch (error) {
            logger.error(`Guruhga xabar yuborishda xato: ${error.message}`);
          }
        });
      } else {
        // Ruxsat yo'qligi haqida xabar
        await bot.sendMessage(
          userId,
          "Sizda xabar yuborish uchun ruxsat yo'q. Xabar yuborish imkoniyatini olish uchun adminlarga murojaat qiling."
        );
      }
    }
  } catch (error) {
    logger.error(`Xatolik yuz berdi: ${error.message}`);
    await bot.sendMessage(
      userId,
      "Xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko'ring."
    );
  }
});

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const userId = msg.from.id;
  const user = checkUser(userId);
  const opts = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Admin tayinlash", callback_data: "addAdmin" }],
        [{ text: "Adminlikni olish", callback_data: "removeAdmin" }],
        [{ text: "Chiqish", callback_data: "exit" }],
      ],
    },
  };
  if (text === "/admin") {
    statusType = "admin";
    if (user.permissions.isAdmin) {
      bot.sendMessage(chatId, `${user.fullName}`, opts);
    } else {
      bot.sendMessage(chatId, `Sizda adminlik huquqi yo'q `);
    }
  }
});

// Kodni tekshirish
bot.onText(/(\d{6})/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const code = match[1];
  currentUserCode = match[1];
  const userPermissions = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Adminlik huquqi", callback_data: "isAdmin" }],
        [{ text: "Habar yuborish", callback_data: "sendMessage" }],
        // [{ text: "Admin qo'shish", callback_data: "addNewAdmin" }],
        [{ text: "Chiqish", callback_data: "exit" }],
      ],
    },
  };
  const selectedUser = findUserByActivationCode(data.users, code);
  if (selectedUser && callbackQuaryType === "addAdmin") {
    data.users.forEach((element) => {
      if (element.id == selectedUser.id && statusType === "admin") {
        bot.sendMessage(
          chatId,
          "Qanday Imkoniyatlar qo'shmoqchisiz",
          userPermissions
        );
      }
    });
    updateDataFile();
  } else if (selectedUser && callbackQuaryType === "removeAdmin") {
    data.users.forEach((element) => {
      if (element.id == selectedUser.id && statusType === "admin") {
        bot.sendMessage(
          chatId,
          "Qanday Imkoniyatlar olmoqchisiz",
          userPermissions
        );
      }
    });
    updateDataFile();
  } else if (statusType === "admin") {
    bot.sendMessage(chatId, `Kod noto'g'ri. Iltimos, qaytadan urinib ko'ring.`);
  } else {
    data.groups.forEach((group) => {
      bot.sendMessage(group.id, msg.text);
    });
  }
});

// Callback_query ni qabul qilish
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const queryData = query.data; // Tugma bosilganda yuborilgan ma'lumot (callback_data)
  callbackQuaryType = query.data;
  if (queryData === "addAdmin") {
    processType = "add";
    bot.sendMessage(chatId, `Yangi admin ID raqamini kirting`);
  } else if (queryData === "removeAdmin") {
    processType = "remove";
    bot.sendMessage(chatId, `Admin ID raqamini kirting`);
  } else if (queryData === "isAdmin") {
    statusManager(
      data.users,
      currentUserCode,
      "isAdmin",
      chatId,
      "Adminlik huquqi",
      processType
    );
  } else if (queryData === "sendMessage") {
    statusManager(
      data.users,
      currentUserCode,
      "sendMessage",
      chatId,
      "Habar yuborish huquqi",
      processType
    );
  } else if (queryData === "addNewAdmin") {
    statusManager(
      data.users,
      currentUserCode,
      "addNewAdmin",
      chatId,
      "Yangi admin qo'shish huquqi",
      processType
    );
  } else if (queryData === "exit") {
    statusType = "user";
    bot.sendMessage(chatId, `Siz Admin paneldan chiqdingiz`);
  }

  // Callback_query ni yopish (tugma bosilganda "yuklanmoqda" animatsiyasini to'xtatish)
  bot.answerCallbackQuery(query.id);
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
  data.users.forEach((user, index) => {
    const joinDate = new Date(user.joinDate);
    const daysSinceJoin = (now - joinDate) / (1000 * 60 * 60 * 24);
    if (daysSinceJoin >= 30 && user.activationCode !== "513437") {
      data.users[index].permissions.isAdmin = false;
      data.users[index].permissions.sendMessage = false;
    }
  });
  updateDataFile();
}, 24 * 60 * 60 * 1000);

// Polling xatosini boshqarish
bot.on("polling_error", (error) => {
  logger.error(`Polling xatosi: ${error.message}`);
  logger.error(`Xato tafsilotlari: ${JSON.stringify(error)}`);
});
console.log("bot is working...");
