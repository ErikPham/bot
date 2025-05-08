import { verifyKey } from 'discord-interactions';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { InteractionType, InteractionResponseType } from 'discord-api-types/v10';

// Import các lệnh
import addCommand from '../commands/add';
import removeCommand from '../commands/remove';
import listCommand from '../commands/list';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Xác thực yêu cầu từ Discord
  const signature = req.headers['x-signature-ed25519'] as string;
  const timestamp = req.headers['x-signature-timestamp'] as string;
  const body = JSON.stringify(req.body);
  
  const isValid = verifyKey(
    Buffer.from(body),
    signature,
    timestamp,
    process.env.DISCORD_PUBLIC_KEY as string
  );

  if (!isValid) {
    return res.status(401).send('Không hợp lệ');
  }

  const interaction = req.body;

  // Xử lý PING từ Discord
  if (interaction.type === InteractionType.Ping) {
    return res.status(200).json({ type: InteractionResponseType.Pong });
  }

  // Xử lý lệnh
  if (interaction.type === InteractionType.ApplicationCommand) {
    const { name } = interaction.data;

    try {
      let response;
      switch (name) {
        case 'add':
          response = await addCommand.execute(interaction);
          break;
        case 'remove':
          response = await removeCommand.execute(interaction);
          break;
        case 'list':
          response = await listCommand.execute(interaction);
          break;
        default:
          response = {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: { content: 'Lệnh không được hỗ trợ' }
          };
      }

      return res.status(200).json(response);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: 'Đã xảy ra lỗi khi xử lý lệnh' }
      });
    }
  }

  return res.status(400).send('Loại tương tác không được hỗ trợ');
}