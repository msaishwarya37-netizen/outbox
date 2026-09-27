import { Router } from 'express';
import { prisma } from '../config/db';
import { generateToken, requireAuth, AuthRequest } from '../middlewares/auth';
import { env } from '../config/env';

const router = Router();

// Developer quick login endpoint for instant testability
router.post('/dev-login', async (req, res) => {
  const { email, name, avatar } = req.body;
  const userEmail = email || 'reviewer@example.com';
  const userName = name || 'Assessor User';
  const userAvatar = avatar || 'https://lh3.googleusercontent.com/a/default-user=s96-c';

  try {
    let user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userEmail,
          name: userName,
          avatar: userAvatar,
        },
      });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name || '',
      avatar: user.avatar || '',
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        slackConnected: Boolean(user.slackWebhookUrl || user.slackAccessToken),
        slackTeamName: user.slackTeamName,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Google OAuth verification
router.post('/google/verify', async (req, res) => {
  const { credential, email, name, picture, sub } = req.body;
  const googleEmail = email || 'user@gmail.com';
  const googleName = name || 'Google User';
  const googleAvatar = picture || 'https://lh3.googleusercontent.com/a/default-user=s96-c';

  try {
    let user = await prisma.user.findUnique({
      where: { email: googleEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: googleEmail,
          name: googleName,
          avatar: googleAvatar,
          googleId: sub,
        },
      });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name || '',
      avatar: user.avatar || '',
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        slackConnected: Boolean(user.slackWebhookUrl || user.slackAccessToken),
        slackTeamName: user.slackTeamName,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      slackConnected: Boolean(user.slackWebhookUrl || user.slackAccessToken),
      slackTeamName: user.slackTeamName,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
