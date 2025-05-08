import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function registerCommands() {
  const commands = [];
  const commandFiles = fs.readdirSync(__dirname)
    .filter(file => file.endsWith('.ts') && file !== 'register.ts');

  for (const file of commandFiles) {
    // Loại bỏ phần mở rộng .ts để import
    const commandName = file.replace('.ts', '');
    const command = (await import(`./${commandName}`)).default;
    commands.push(command.data.toJSON());
  }

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN || '');

  try {
    console.log('Bắt đầu đăng ký các lệnh ứng dụng (/).');

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID || ''),
      { body: commands },
    );

    console.log('Đăng ký lệnh thành công.');
  } catch (error) {
    console.error(error);
  }
}