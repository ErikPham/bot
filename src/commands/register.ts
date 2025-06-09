/**
 * Command Registration Module
 * 
 * Module quản lý đăng ký các Slash Commands với Discord API
 */
import { REST, Routes } from 'discord.js'
import { config } from 'dotenv'
import type { CommandsCollection } from '../types/stock'
import process from 'node:process'

// Import các commands
import stockCommand from './stock'
import portfolioCommand from './portfolio'
import followCommand from './follow'
import * as predictionCommand from './prediction'

config()

const commands = [
  stockCommand.data,
  portfolioCommand.data,
  followCommand.data,
  predictionCommand.data,
]

const rest = new REST().setToken(process.env.DISCORD_TOKEN!)

/**
 * Đăng ký các commands với Discord API
 */
export const registerCommands = async (): Promise<CommandsCollection> => {
  try {
    console.log('Đang đăng ký application (/) commands...')

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID!),
      { body: commands },
    )

    console.log('Đăng ký commands thành công!')
    return commandsCollection;
  }
  catch (error) {
    console.error('Lỗi khi đăng ký commands:', error)
    return commandsCollection;
  }
}

/**
 * Danh sách các commands được export để sử dụng trong xử lý tương tác
 */
export const commandsCollection: CommandsCollection = {
  stock: stockCommand,
  portfolio: portfolioCommand,
  follow: followCommand,
  prediction: predictionCommand,
}
