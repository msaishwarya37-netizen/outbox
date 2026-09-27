import { Router } from 'express';
import { prisma } from '../config/db';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { env } from '../config/env';

const router = Router();

// GET /api/slack/authorize URL generator
router.get('/authorize', requireAuth, (req: AuthRequest, res) => {
  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${env.SLACK_CLIENT_ID}&scope=incoming-webhook,chat:write&redirect_uri=${encodeURIComponent(
    env.SLACK_REDIRECT_URI
  )}&state=${req.user!.id}`;
  return res.json({ url: slackAuthUrl });
});

// GET /api/slack/callback (Slack OAuth redirect)
router.get('/callback', async (req, res) => {
  const { code, state } = req.query; // state contains userId

  if (!code || typeof code !== 'string') {
    return res.status(400).send('Authorization code missing from Slack callback');
  }

  try {
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.SLACK_CLIENT_ID,
        client_secret: env.SLACK_CLIENT_SECRET,
        code,
        redirect_uri: env.SLACK_REDIRECT_URI,
      }),
    });

    const data: any = await response.json();

    if (!data.ok) {
      console.error('Slack OAuth error:', data);
      return res.redirect(`${env.FRONTEND_URL}/dashboard?slack_error=${encodeURIComponent(data.error || 'slack_auth_failed')}`);
    }

    const userId = (state as string) || '';
    const webhookUrl = data.incoming_webhook?.url;
    const teamName = data.team?.name;

    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          slackWebhookUrl: webhookUrl,
          slackAccessToken: data.access_token,
          slackTeamName: teamName,
        },
      });
    }

    return res.redirect(`${env.FRONTEND_URL}/dashboard?slack_connected=true`);
  } catch (error: any) {
    console.error('Slack callback internal error:', error.message);
    return res.redirect(`${env.FRONTEND_URL}/dashboard?slack_error=internal_error`);
  }
});

// POST /api/slack/webhook (Direct Webhook save option for dev testing)
router.post('/webhook', requireAuth, async (req: AuthRequest, res) => {
  const { webhookUrl, teamName } = req.body;

  if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/')) {
    return res.status(400).json({ error: 'Valid Slack incoming webhook URL is required' });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        slackWebhookUrl: webhookUrl,
        slackTeamName: teamName || 'Custom Slack Workspace',
      },
    });

    return res.json({
      message: 'Slack webhook connected successfully',
      slackConnected: true,
      slackTeamName: updated.slackTeamName,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// DELETE /api/slack/disconnect
router.delete('/disconnect', requireAuth, async (req: AuthRequest, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        slackWebhookUrl: null,
        slackAccessToken: null,
        slackTeamName: null,
      },
    });

    return res.json({ message: 'Slack disconnected successfully', slackConnected: false });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
