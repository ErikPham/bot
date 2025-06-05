import type { CommandsCollection } from '../types/stock'
import process from 'node:process'
import { REST, Routes } from 'discord.js'
import { config } from 'dotenv'
import portfolio from './portfolio'
import follow from './follow'
import stock from './stock'

config()

const commands = [
  follow.data,
  stock.data,
  portfolio.data,
]

const rest = new REST().setToken(process.env.DISCORD_TOKEN!)

export const registerCommands = async (): Promise<CommandsCollection> => {
  try {
    console.log('Started refreshing application (/) commands.')

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID!),
      { body: commands },
    )

    console.log('Successfully reloaded application (/) commands.')
    return commandsCollection;
  }
  catch (error) {
    console.error(error)
    return commandsCollection;
  }
}

export const commandsCollection: CommandsCollection = {
  follow,
  stock,
  portfolio,
}
