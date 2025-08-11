import { Client } from "discord.js";

const client = new Client({ intents: [] });
await client.login(process.env.BOT_TOKEN);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  
  const { userId, imageBase64 } = req.body;
  const buffer = Buffer.from(imageBase64.split(",")[1], "base64");

  try {
    const user = await client.users.fetch(userId);
    await user.send({ files: [{ attachment: buffer, name: "wordle.png" }] });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
}
