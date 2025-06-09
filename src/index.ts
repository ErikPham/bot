import { Events, MessageFlags } from 'discord.js';
import type { Interaction } from 'discord.js';
import { createDiscordClient, CLIENT_EVENTS } from './discord/client';
import { createScheduler, SCHEDULER_EVENTS } from './scheduler';
import { registerCommands } from './commands/register';
import dotenv from 'dotenv';

// Tải biến môi trường từ file .env
dotenv.config();

/**
 * Xử lý lệnh từ người dùng
 */
async function handleCommand(interaction: Interaction, commands: Record<string, any>) {
  // Handle autocomplete interactions
  if (interaction.isAutocomplete()) {
    const { commandName } = interaction;
    const command = commands[commandName];
    
    if (command && command.autocomplete) {
      try {
        await command.autocomplete(interaction);
      } catch (error) {
        console.error(`Lỗi khi xử lý autocomplete cho lệnh ${commandName}:`, error);
      }
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;
  
  // Lấy command từ danh sách commands đã đăng ký
  const command = commands[commandName];
  
  if (!command) {
    try {
      await interaction.reply({
        content: 'Lệnh không hợp lệ!',
        flags: MessageFlags.Ephemeral
      });
    } catch (replyError) {
      console.error('Không thể gửi thông báo lệnh không hợp lệ:', replyError);
    }
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Lỗi khi thực thi lệnh ${commandName}:`, error);
  }
}

/**
 * Thiết lập xử lý tắt ứng dụng gracefully
 */
function setupGracefulShutdown(scheduler: ReturnType<typeof createScheduler>) {
  let isShuttingDown = false;
  
  async function shutdown(signal: string) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    console.log(`Nhận tín hiệu ${signal}, đang tắt ứng dụng...`);
    
    try {
      await scheduler.destroy();
      console.log('Đã tắt ứng dụng thành công');
    } catch (error) {
      console.error('Lỗi khi tắt ứng dụng:', error);
    } finally {
      process.exit(0);
    }
  }
  
  // Xử lý các tín hiệu tắt
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('uncaughtException', (error) => {
    console.error('Lỗi không được xử lý:', error);
    shutdown('uncaughtException');
  });
  process.on('unhandledRejection', (reason) => {
    console.error('Promise rejection không được xử lý:', reason);
    shutdown('unhandledRejection');
  });
}

async function main() {
  try {
    console.log('Khởi động ứng dụng theo dõi chứng khoán...');
    
    // Khởi tạo Discord client
    const discordClient = createDiscordClient();
    
    // Đăng ký event handlers cho client
    discordClient.on(CLIENT_EVENTS.READY, () => {
      console.log('Discord client đã sẵn sàng');
    });
    
    discordClient.on(CLIENT_EVENTS.ERROR, (error) => {
      console.error('Lỗi Discord client:', error);
    });
    
    discordClient.on(CLIENT_EVENTS.DISCONNECTED, () => {
      console.log('Discord client đã ngắt kết nối');
    });
    
    // Đăng nhập Discord
    const loginSuccess = await discordClient.login(process.env.DISCORD_TOKEN);
    if (!loginSuccess) {
      throw new Error('Không thể đăng nhập vào Discord');
    }
    
    // Đăng ký commands
    const commands = await registerCommands();
    console.log(`Đã đăng ký ${Object.keys(commands).length} commands`);

    // Xử lý tương tác (slash commands)
    discordClient.client.on(Events.InteractionCreate, (interaction) => 
      handleCommand(interaction, commands)
    );
    
    // Khởi tạo scheduler
    const scheduler = createScheduler(discordClient);
    
    // Đăng ký event handlers cho scheduler
    scheduler.on(SCHEDULER_EVENTS.INITIALIZED, () => {
      console.log('Scheduler đã được khởi tạo');
    });
    
    scheduler.on(SCHEDULER_EVENTS.STARTED, (data) => {
      if (data && data.channelId) {
        console.log(`Đã khởi động trackers cho kênh: ${data.channelId}`);
      } else {
        console.log('Đã khởi động tất cả các trackers');
      }
    });
    
    scheduler.on(SCHEDULER_EVENTS.ERROR, (error) => {
      console.error('Lỗi scheduler:', error);
    });
    
    // Khởi tạo scheduler
    await scheduler.initialize();
    
    // Khởi động tất cả các trackers
    await scheduler.startAllTrackers();
    
    // Thiết lập xử lý tắt ứng dụng gracefully
    setupGracefulShutdown(scheduler);
    
    console.log('Ứng dụng đã khởi động thành công');
  } catch (error) {
    console.error('Lỗi khi khởi động ứng dụng:', error);
    process.exit(1);
  }
}

// Khởi chạy ứng dụng
main();
