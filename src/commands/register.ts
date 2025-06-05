import type { CommandsCollection } from '../types/stock'
import process from 'node:process'
import { REST, Routes } from 'discord.js'
import { config } from 'dotenv'
import add from './add'
import list from './list'
import portfolio from './portfolio'
import remove from './remove'

config()

export async function registerCommands(): Promise<CommandsCollection> {
  const registerCommands: CommandsCollection = {
    add,
    remove,
    portfolio,
    list,
  }
  const regissterCommands = {
    add,
    remove,
    portfolio,
    list,
  }

  const commands = []
  for (const [_, file] of Object.entries(regissterCommands)) {
    commands.push(file.data.toJSON())
  }

  try {
    const isDev = process.env.NODE_ENV !== 'production'
    const clientId = process.env.CLIENT_ID || ''
    const guildId = process.env.GUILD_ID || ''
    const token = process.env.DISCORD_TOKEN || ''
    const rest = new REST({ version: '10' }).setToken(token)

    if (isDev) {
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands },
      )
    }
    else {
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands },
      )
    }

    return registerCommands
  }
  catch (error) {
    console.error(error)
    throw error
  }
}
