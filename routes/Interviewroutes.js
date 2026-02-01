import express from 'express';
const router = express.Router();

import interviewController from '../controllers/interviewController.js';

/**
 * @route   POST /api/interview/start
 * @desc    Start a new interview session
 * @body    { candidateId, resumeId, jobDescription, jobRole }
 */
router.post('/start', interviewController.startInterview);

/**
 * @route   POST /api/interview/submit-answer
 * @desc    Submit answer to current question and get next question
 * @body    { interviewId, questionNumber, answer }
 */
router.post('/submit-answer', interviewController.submitAnswer);

/**
 * @route   GET /api/interview/status/:interviewId
 * @desc    Get current interview status
 */
router.get('/status/:interviewId', interviewController.getInterviewStatus);

/**
 * @route   GET /api/interview/report/:interviewId
 * @desc    Get final interview report (only for completed/terminated interviews)
 */
router.get('/report/:interviewId', interviewController.getInterviewReport);

export default router;