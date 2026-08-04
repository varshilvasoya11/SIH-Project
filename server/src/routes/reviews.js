// ==============================================
// Review Routes — Post-consultation feedback
// ==============================================

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// POST /api/reviews — Submit a review
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const { consultationId, rating, feedbackText } = req.body;

    if (!consultationId || !rating) {
      return res.status(400).json({ error: 'consultationId and rating required' });
    }

    const review = await prisma.review.create({
      data: {
        consultationId,
        rating: parseInt(rating),
        feedbackText,
      },
    });

    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
});

// GET /api/reviews/doctor/:doctorId — Get reviews for a doctor
router.get('/doctor/:doctorId', authMiddleware, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const reviews = await prisma.review.findMany({
      where: {
        consultation: { doctorId: req.params.doctorId },
      },
      include: {
        consultation: {
          include: {
            villager: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const avgRating = reviews.length
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0;

    res.json({ reviews, averageRating: parseFloat(avgRating), totalReviews: reviews.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
