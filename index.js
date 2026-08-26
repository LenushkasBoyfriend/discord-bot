// =======================================================
//  Otomatik Mesaj Botu - reis'in sunucusu için
// =======================================================
// Bu bot RESMİ Discord Bot API'sini kullanır (self-bot DEĞİLDİR).
// Discord Developer Portal'dan aldığın BOT TOKEN ile çalışır.
// =======================================================

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");

const CONFIG_PATH = path.join(__dirname, "config.json");
const PREFIX = "o!";

// ---- Ayarları diskten oku / yoksa oluştur -------------------------------
function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}
function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

let config = loadConfig(); // { [guildId]: { channelId: "..." } }

// ---- Gönderilecek mesajlar (istediğin 3 metin) ---------------------------
const MESSAGES_10S = ["owo", "Görüşürüz!"]; // sırayla, her 10 saniyede birer birer
const MESSAGE_7M = "Nasılsınız!"; // her 7 dakikada bir

const INTERVAL_10S = 10 * 1000; // 10 saniye
const INTERVAL_7M = 7 * 60 * 1000; // 7 dakika

// ---- Discord istemcisi -----------------------------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.once("ready", () => {
  console.log(`✅ Giriş yapıldı: ${client.user.tag}`);
  startTimers();
});

// ---- Komut: o!channel #kanal -----------------------------------------
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;
  if (!message.guild) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift().toLowerCase();

  if (command === "channel") {
    // Sadece "Kanalları Yönet" yetkisi olanlar ayarlayabilsin
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)
    ) {
      return message.reply(
        "❌ Bu komutu kullanmak için 'Kanalları Yönet' yetkin olmalı."
      );
    }

    const targetChannel =
      message.mentions.channels.first() ||
      message.guild.channels.cache.get(args[0]);

    if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
      return message.reply(
        `⚠️ Kullanım: \`${PREFIX}channel #kanal-adı\` (geçerli bir metin kanalı etiketle)`
      );
    }

    config[message.guild.id] = { channelId: targetChannel.id };
    saveConfig(config);

    return message.reply(
      `✅ Otomatik mesajlar artık ${targetChannel} kanalına gönderilecek.`
    );
  }

  if (command === "status") {
    const guildConfig = config[message.guild.id];
    if (!guildConfig) {
      return message.reply(
        `ℹ️ Henüz kanal ayarlanmadı. \`${PREFIX}channel #kanal\` ile ayarla.`
      );
    }
    return message.reply(`ℹ️ Ayarlı kanal: <#${guildConfig.channelId}>`);
  }
});

// ---- Zamanlayıcılar -----------------------------------------------------
let msgIndex = 0; // Selamlar! <-> Görüşürüz! arasında geçiş yapmak için

function startTimers() {
  // Her 10 saniyede: sırayla "Selamlar!" ve "Görüşürüz!"
  setInterval(() => {
    const text = MESSAGES_10S[msgIndex % MESSAGES_10S.length];
    msgIndex++;
    broadcastToAllGuilds(text);
  }, INTERVAL_10S);

  // Her 7 dakikada: "Nasılsınız!"
  setInterval(() => {
    broadcastToAllGuilds(MESSAGE_7M);
  }, INTERVAL_7M);
}

function broadcastToAllGuilds(text) {
  for (const guildId of Object.keys(config)) {
    const channelId = config[guildId]?.channelId;
    if (!channelId) continue;

    const channel = client.channels.cache.get(channelId);
    if (channel && channel.isTextBased()) {
      channel.send(text).catch((err) => {
        console.error(`⚠️ ${guildId} kanalına mesaj gönderilemedi:`, err.message);
      });
    }
  }
}

// ---- Giriş --------------------------------------------------------------
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("❌ DISCORD_TOKEN bulunamadı! .env dosyasına ekle.");
  process.exit(1);
}
client.login(token);
