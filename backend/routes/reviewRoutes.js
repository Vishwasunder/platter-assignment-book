const express = require('express');
const Review = require('../models/Review');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

// GET: Retrieve all reviews
router.get('/', async (req, res) => {
  try {
    const reviews = await Review.find().populate('reviewer', 'username');
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// POST: Create a new review (Authenticated users only)
router.post('/', protect, async (req, res) => {
  const { bookTitle, author, reviewContent } = req.body;

  try {
    const newReview = new Review({
      bookTitle,
      author,
      reviewContent,
      reviewer: req.user._id,
    });

    const savedReview = await newReview.save();
    res.status(201).json(savedReview);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// PUT: Edit a review (Authenticated users can edit their own reviews)
router.put('/:id', protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if the logged-in user is the owner of the review
    if (review.reviewer.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to edit this review' });
    }

    const updatedReview = await Review.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    res.json(updatedReview);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// DELETE: Delete a review (Authenticated users can delete their own reviews)
router.delete('/:id', protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if the logged-in user is the owner of the review
    if (review.reviewer.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to delete this review' });
    }

    await review.remove();
    res.json({ message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// POST: Rate a review (Authenticated users only)
router.post('/:id/rate', protect, async (req, res) => {
  const { rating } = req.body;

  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Prevent users from rating their own reviews
    if (review.reviewer.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot rate your own review' });
    }

    // Check if user already rated the review
    const alreadyRated = review.ratings.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (alreadyRated) {
      return res.status(400).json({ message: 'You have already rated this review' });
    }

    // Add the rating
    review.ratings.push({ user: req.user._id, rating });
    await review.save();

    res.json({ message: 'Rating added' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
