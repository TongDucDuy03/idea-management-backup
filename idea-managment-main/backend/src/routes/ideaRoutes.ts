import express from 'express';
import { getAllIdeas, getPublicIdeas, createIdea, updateIdea, deleteIdea, updatePaymentStatus, getIdeaStats } from '../controllers/ideaController';
import Idea from '../models/Idea';
import { auth, requireRole } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';

const router = express.Router();
router.post('/', rateLimit({ scope: 'idea-submit', windowMs: 60 * 60 * 1000,
  max: Number(process.env.IDEA_SUBMIT_LIMIT_PER_HOUR || 20) }), createIdea);

// Anonymous lookup exposes progress only, never the internal record or media.
const lookupLimit = rateLimit({ scope: 'idea-lookup', windowMs: 60 * 1000, max: 30 });
const lookup: express.RequestHandler = async (req, res, next) => {
  try {
    const code = req.params.ideaCode || req.query.ideaCode;
    if (typeof code !== 'string' || !/^[A-Za-z0-9-]{1,80}$/.test(code.trim())) {
      res.status(400).json({ message: 'Mã ý tưởng không hợp lệ' }); return;
    }
    const idea = await Idea.findOne({ ideaCode: code.trim() })
      .select('ideaCode status implementationStatus submissionDate expectedCompletionDate -_id').lean();
    res.setHeader('Cache-Control', 'no-store');
    if (!idea) { res.status(404).json({ message: 'Không tìm thấy ý tưởng' }); return; }
    res.json(idea);
  } catch (error) { next(error); }
};
router.get('/code/:ideaCode', lookupLimit, lookup);
router.get('/search', lookupLimit, lookup);

router.get('/public', rateLimit({ scope: 'public-ideas', windowMs: 60 * 1000, max: 30 }), getPublicIdeas);

router.use(auth);
router.get('/stats', getIdeaStats);
router.get('/', requireRole('admin'), getAllIdeas);
router.get('/detail/code/:ideaCode', async (req, res, next) => {
  try {
    const idea = await Idea.findOne({ ideaCode: req.params.ideaCode });
    if (!idea) { res.status(404).json({ message: 'Không tìm thấy ý tưởng' }); return; }
    res.json(idea);
  } catch (error) { next(error); }
});
router.post('/admin', requireRole('admin'), createIdea);
router.put('/:id', requireRole('admin'), updateIdea);
router.delete('/:id', requireRole('admin'), deleteIdea);
router.patch('/:id/payment', requireRole('admin'), updatePaymentStatus);
export default router;
