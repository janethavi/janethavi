// Cloudflare Pages Function: receives the contact form POST and forwards it
// to Discord. Configure ONE of these in the Pages project settings
// (Settings -> Environment variables, encrypted; never commit them):
//   - DISCORD_TOKEN + DISCORD_CHANNEL_ID  (bot, same values as the homelab
//     cloudapp-env secret), or
//   - DISCORD_WEBHOOK_URL                 (channel webhook)

async function sendToDiscord(env, payload) {
  if (env.DISCORD_WEBHOOK_URL) {
    const res = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  }
  if (env.DISCORD_TOKEN && env.DISCORD_CHANNEL_ID) {
    const res = await fetch(
      `https://discord.com/api/v10/channels/${env.DISCORD_CHANNEL_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bot ${env.DISCORD_TOKEN}`,
        },
        body: JSON.stringify(payload),
      }
    );
    return res.ok;
  }
  return false;
}

export async function onRequestPost({ request, env }) {
  const back = new URL('/about', request.url);
  back.hash = 'contactme';

  let name = '';
  let email = '';
  let message = '';
  let honeypot = '';
  try {
    const form = await request.formData();
    name = String(form.get('name') || '').trim();
    email = String(form.get('email') || '').trim();
    message = String(form.get('message') || '').trim();
    honeypot = String(form.get('website') || '');
  } catch {
    back.searchParams.set('sent', '0');
    return Response.redirect(back.toString(), 303);
  }

  // Bots fill the hidden "website" field: pretend success, send nothing.
  if (honeypot) {
    back.searchParams.set('sent', '1');
    return Response.redirect(back.toString(), 303);
  }

  if (!name || !email || !message || name.length > 200 || message.length > 4000) {
    back.searchParams.set('sent', '0');
    return Response.redirect(back.toString(), 303);
  }

  const payload = {
    embeds: [
      {
        title: '📬 New message from janethfernando.me',
        color: 0x89b0f5,
        fields: [
          { name: 'Name', value: name.slice(0, 256) },
          { name: 'Email', value: email.slice(0, 256) },
          { name: 'Message', value: message.slice(0, 1024) },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };

  let ok = false;
  try {
    ok = await sendToDiscord(env, payload);
  } catch {
    ok = false;
  }

  back.searchParams.set('sent', ok ? '1' : '0');
  return Response.redirect(back.toString(), 303);
}
