import { Router } from 'express';
import {
  improveDescription,
  suggestBenefit,
  suggestSolution,
  suggestTopicTitle
} from '../controllers/aiController';

const router = Router();

router.post('/improve-description', improveDescription);
router.post('/suggest-solution', suggestSolution);
router.post('/suggest-benefit', suggestBenefit);
router.post('/suggest-topic-title', suggestTopicTitle);

export default router;


