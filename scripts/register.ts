import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import addCommand from '../src/commands/add';
import removeCommand from '../src/commands/remove';
import listCommand from '../src/commands/list';

config();

const commands = [
  addCommand.data.toJSON(),
  removeCommand.data.toJSON(),
  listCommand.data.toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN || '');

// Đăng ký lệnh cho server test cụ thể
async function main() {
  try {
    console.log('Bắt đầu đăng ký các lệnh ứng dụng (/).');

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID || '',
        process.env.GUILD_ID || ''
      ),
      { body: commands },
    );

    console.log('Đăng ký lệnh thành công.');
  } catch (error) {
    console.error(error);
  }
}

main();