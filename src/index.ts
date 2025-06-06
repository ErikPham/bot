import process from 'node:process'
import { Client, Events, GatewayIntentBits } from 'discord.js'
import { config as dotenvConfig } from 'dotenv'
import { registerCommands } from './commands/register'
import { Scheduler } from './utils/scheduler'

// Đọc biến môi trường từ file .env
dotenvConfig()

// Khởi tạo client với các intents cần thiết
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
})

// Đăng nhập vào Discord với token
client.login(process.env.DISCORD_TOKEN)

registerCommands().then((commands) => {
  // Sự kiện khi bot sẵn sàng
  client.once(Events.ClientReady, (readyClient) => {
    console.warn(`Đã đăng nhập thành công với tên ${readyClient.user.tag}`)
    
    // Khởi động profit scheduler sau khi bot đã sẵn sàng
    const scheduler = Scheduler.getInstance()
    scheduler.startProfitScheduler(client)
    console.log(`Bot is ready as ${client.user?.tag}`)
  })

  // Xử lý sự kiện tương tác (slash commands)
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand())
      return

    const { commandName } = interaction

    // Xử lý các lệnh
    try {
      const command = commands[commandName]
      if (command) {
        await command.execute(interaction)
      }
      else {
        await interaction.reply({
          content: 'Lệnh không hợp lệ!',
        })
      }
    }
    catch (error) {
      console.error(error)
      if (interaction.replied || interaction.deferred) {
        try {
          await interaction.editReply('Đã xảy ra lỗi khi thực hiện lệnh này!');
        } catch (err) {
          console.error('editReply failed:', err);
        }
      } else {
        try {
          await interaction.reply('Đã xảy ra lỗi khi thực hiện lệnh này!');
        } catch (err) {
          console.error('reply failed:', err);
        }
      }
    }
  })
})
