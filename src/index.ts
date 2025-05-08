import { Client, Events, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';
import { registerCommands } from './commands/register';

// Đọc biến môi trường từ file .env
config();

// Khởi tạo client với các intents cần thiết
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

// Sự kiện khi bot sẵn sàng
client.once(Events.ClientReady, (readyClient) => {
  console.log(`Đã đăng nhập thành công với tên ${readyClient.user.tag}`);
});

// Xử lý sự kiện tương tác (slash commands)
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  // Xử lý các lệnh
  try {
    const command = (await import(`./commands/${commandName}`)).default;
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: 'Đã xảy ra lỗi khi thực hiện lệnh này!',
      ephemeral: true,
    });
  }
});

// Đăng nhập vào Discord với token
client.login(process.env.DISCORD_TOKEN);

// Đăng ký các slash commands
registerCommands();