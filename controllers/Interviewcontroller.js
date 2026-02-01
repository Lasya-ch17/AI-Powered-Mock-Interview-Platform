import Interview from '../models/Interview.js';
import CV_Collection from '../models/CV_Collection.js';
import QuestionGenerator from '../utils/questionGenerator.js';

const questionGenerator = new QuestionGenerator();

// Performance thresholds
const TERMINATION_THRESHOLD = 30; // Terminate if average score falls below 30
const MIN_QUESTIONS = 3; // Minimum questions before allowing termination
const MAX_QUESTIONS = 10; // Maximum questions in an interview

class InterviewController {
  /**
   * Start a new interview session
   */
  async startInterview(req, res) {
    try {
      const { candidateId, resumeId, jobDescription, jobRole } = req.body;

      // Validate inputs
      if (!candidateId || !resumeId || !jobDescription || !jobRole) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: candidateId, resumeId, jobDescription, jobRole'
        });
      }

      // Fetch resume data
      const resume = await CV_Collection.findById(resumeId);
      if (!resume) {
        return res.status(404).json({
          success: false,
          message: 'Resume not found'
        });
      }

      // Create new interview session
      const interview = new Interview({
        candidateId,
        resumeId,
        jobDescription,
        jobRole,
        status: 'in-progress',
        currentDifficulty: 'easy'
      });

      await interview.save();

      // Generate first question
      const firstQuestion = await questionGenerator.generateQuestion({
        resumeData: resume,
        jobDescription,
        jobRole,
        difficulty: 'easy',
        category: 'technical',
        previousQuestions: [],
        previousPerformance: null
      });

      // Add question to interview
      interview.questions.push({
        questionNumber: 1,
        question: firstQuestion.question,
        difficulty: firstQuestion.difficulty,
        category: firstQuestion.category,
        askedAt: new Date(),
        timeAllowed: firstQuestion.timeAllowed,
        expectedKeyPoints: firstQuestion.expectedKeyPoints
      });

      interview.performance.totalQuestions = 1;
      await interview.save();

      res.status(201).json({
        success: true,
        message: 'Interview started successfully',
        data: {
          interviewId: interview._id,
          currentQuestion: {
            questionNumber: 1,
            question: firstQuestion.question,
            difficulty: firstQuestion.difficulty,
            category: firstQuestion.category,
            timeAllowed: firstQuestion.timeAllowed
          }
        }
      });
    } catch (error) {
      console.error('Error starting interview:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start interview',
        error: error.message
      });
    }
  }

  /**
   * Submit answer and get next question
   */
  async submitAnswer(req, res) {
    try {
      const { interviewId, questionNumber, answer,timeTaken } = req.body;

      // Validate inputs
     if (!interviewId || questionNumber === undefined || !answer || timeTaken === undefined) {
  return res.status(400).json({
    success: false,
    message: 'Missing required fields: interviewId, questionNumber, answer, timeTaken'
  });
}

      const interview = await Interview.findById(interviewId).populate('resumeId');
      if (!interview) {
        return res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
      }

      if (interview.status !== 'in-progress') {
        return res.status(400).json({
          success: false,
          message: 'Interview is not active'
        });
      }

      // Find the current question
      const currentQuestion = interview.questions.find(
        q => q.questionNumber === questionNumber
      );

      if (!currentQuestion) {
        return res.status(404).json({
          success: false,
          message: 'Question not found'
        });
      }
      
      // Update question with answer
      currentQuestion.answer = answer;
      currentQuestion.answeredAt = new Date();
      currentQuestion.timeTaken = timeTaken;

      // Evaluate the answer
      const evaluation = await questionGenerator.evaluateAnswer({
        question: currentQuestion.question,
        answer,
        expectedKeyPoints: currentQuestion.expectedKeyPoints || [],
        difficulty: currentQuestion.difficulty,
        category: currentQuestion.category,
        timeTaken,
        timeAllowed: currentQuestion.timeAllowed
      });

      // Store scores
      currentQuestion.score = {
        accuracy: evaluation.scores.accuracy,
        clarity: evaluation.scores.clarity,
        depth: evaluation.scores.depth,
        relevance: evaluation.scores.relevance,
        timeEfficiency: evaluation.scores.timeEfficiency,
        overall: evaluation.scores.overall
      };
      currentQuestion.feedback = evaluation.feedback;

      // Update performance metrics
      interview.performance.questionsAnswered += 1;
      this.updatePerformanceMetrics(interview);

      // Check for early termination
      const shouldTerminate = this.checkTermination(interview);
      
      if (shouldTerminate) {
        return await this.terminateInterview(interview, res, 'Performance below threshold');
      }

      // Check if max questions reached
      if (interview.performance.totalQuestions >= MAX_QUESTIONS) {
        return await this.completeInterview(interview, res);
      }

      // Determine next difficulty
      const nextDifficulty = questionGenerator.determineNextDifficulty(
        interview.currentDifficulty,
        evaluation.nextDifficulty
      );
      interview.currentDifficulty = nextDifficulty;

      // Determine next category
      const nextCategory = questionGenerator.determineQuestionCategory(
        interview.performance.totalQuestions + 1,
        MAX_QUESTIONS
      );

      // Generate next question
      const nextQuestion = await questionGenerator.generateQuestion({
        resumeData: interview.resumeId,
        jobDescription: interview.jobDescription,
        jobRole: interview.jobRole,
        difficulty: nextDifficulty,
        category: nextCategory,
        previousQuestions: interview.questions.map(q => q.question),
        previousPerformance: {
          averageScore: interview.performance.averageScore,
          lastScore: evaluation.scores.overall
        }
      });

      // Add next question
      interview.questions.push({
        questionNumber: interview.performance.totalQuestions + 1,
        question: nextQuestion.question,
        difficulty: nextQuestion.difficulty,
        category: nextQuestion.category,
        askedAt: new Date(),
        timeAllowed: nextQuestion.timeAllowed,
        expectedKeyPoints: nextQuestion.expectedKeyPoints
      });

      interview.performance.totalQuestions += 1;
      await interview.save();

      res.json({
        success: true,
        message: 'Answer submitted successfully',
        data: {
          currentQuestionFeedback: {
            score: evaluation.scores.overall,
            feedback: evaluation.feedback
          },
          nextQuestion: {
            questionNumber: interview.performance.totalQuestions,
            question: nextQuestion.question,
            difficulty: nextQuestion.difficulty,
            category: nextQuestion.category,
            timeAllowed: nextQuestion.timeAllowed
          },
          performance: {
            questionsAnswered: interview.performance.questionsAnswered,
            averageScore: Math.round(interview.performance.averageScore),
            currentDifficulty: nextDifficulty
          }
        }
      });
    } catch (error) {
      console.error('Error submitting answer:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit answer',
        error: error.message
      });
    }
  }

  /**
   * Get interview status
   */
  async getInterviewStatus(req, res) {
    try {
      const { interviewId } = req.params;

      const interview = await Interview.findById(interviewId);
      if (!interview) {
        return res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
      }

      res.json({
        success: true,
        data: {
          status: interview.status,
          currentDifficulty: interview.currentDifficulty,
          performance: interview.performance,
          questionsAnswered: interview.performance.questionsAnswered,
          totalQuestions: interview.performance.totalQuestions,
          finalScore: interview.finalScore,
          readinessLevel: interview.readinessLevel
        }
      });
    } catch (error) {
      console.error('Error fetching interview status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch interview status',
        error: error.message
      });
    }
  }

  /**
   * Get final interview report
   */
  async getInterviewReport(req, res) {
    try {
      const { interviewId } = req.params;

      const interview = await Interview.findById(interviewId);
      if (!interview) {
        return res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
      }

      if (interview.status === 'in-progress') {
        return res.status(400).json({
          success: false,
          message: 'Interview is still in progress'
        });
      }

      res.json({
        success: true,
        data: {
          interviewId: interview._id,
          candidateId: interview.candidateId,
          jobRole: interview.jobRole,
          status: interview.status,
          finalScore: interview.finalScore,
          readinessLevel: interview.readinessLevel,
          performance: {
            totalQuestions: interview.performance.totalQuestions,
            questionsAnswered: interview.performance.questionsAnswered,
            averageScore: Math.round(interview.performance.averageScore),
            timeManagement: Math.round(interview.performance.timeManagement),
            technicalScore: Math.round(interview.performance.technicalScore),
            behavioralScore: Math.round(interview.performance.behavioralScore),
            conceptualScore: Math.round(interview.performance.conceptualScore),
            scenarioScore: Math.round(interview.performance.scenarioScore)
          },
          strengths: interview.strengths,
          weaknesses: interview.weaknesses,
          actionableFeedback: interview.actionableFeedback,
          questions: interview.questions.map(q => ({
            questionNumber: q.questionNumber,
            question: q.question,
            difficulty: q.difficulty,
            category: q.category,
            answer: q.answer,
            timeTaken: q.timeTaken,
            timeAllowed: q.timeAllowed,
            score: q.score,
            feedback: q.feedback
          })),
          terminationReason: interview.terminationReason,
          completedAt: interview.completedAt
        }
      });
    } catch (error) {
      console.error('Error fetching interview report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch interview report',
        error: error.message
      });
    }
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(interview) {
    const answeredQuestions = interview.questions.filter(q => q.score);
    
    if (answeredQuestions.length === 0) return;

    // Calculate average score
    const totalScore = answeredQuestions.reduce((sum, q) => sum + q.score.overall, 0);
    interview.performance.averageScore = totalScore / answeredQuestions.length;

    // Calculate time management score
    const timeScores = answeredQuestions.map(q => q.score.timeEfficiency);
    interview.performance.timeManagement = 
      timeScores.reduce((sum, score) => sum + score, 0) / timeScores.length;

    // Calculate category-wise scores
    const categories = ['technical', 'behavioral', 'conceptual', 'scenario'];
    categories.forEach(category => {
      const categoryQuestions = answeredQuestions.filter(q => q.category === category);
      if (categoryQuestions.length > 0) {
        const categoryScore = categoryQuestions.reduce(
          (sum, q) => sum + q.score.overall, 0
        ) / categoryQuestions.length;
        interview.performance[`${category}Score`] = categoryScore;
      }
    });
  }

  /**
   * Check if interview should be terminated early
   */
  checkTermination(interview) {
    if (interview.performance.questionsAnswered < MIN_QUESTIONS) {
      return false;
    }

    return interview.performance.averageScore < TERMINATION_THRESHOLD;
  }

  /**
   * Terminate interview early
   */
  async terminateInterview(interview, res, reason) {
    interview.status = 'terminated';
    interview.terminationReason = reason;
    interview.completedAt = new Date();
    
    // Calculate final score
    interview.calculateFinalScore();

    // Generate final report
    const report = await questionGenerator.generateFinalReport({
      questions: interview.questions,
      performance: interview.performance,
      finalScore: interview.finalScore,
      readinessLevel: interview.readinessLevel,
      jobRole: interview.jobRole
    });

    interview.strengths = report.strengths;
    interview.weaknesses = report.weaknesses;
    interview.actionableFeedback = report.actionableFeedback;

    await interview.save();

    return res.json({
      success: true,
      message: 'Interview terminated early due to poor performance',
      data: {
        status: 'terminated',
        reason: reason,
        finalScore: interview.finalScore,
        readinessLevel: interview.readinessLevel,
        reportId: interview._id
      }
    });
  }

  /**
   * Complete interview successfully
   */
  async completeInterview(interview, res) {
    interview.status = 'completed';
    interview.completedAt = new Date();
    
    // Calculate final score
    interview.calculateFinalScore();

    // Generate final report
    const report = await questionGenerator.generateFinalReport({
      questions: interview.questions,
      performance: interview.performance,
      finalScore: interview.finalScore,
      readinessLevel: interview.readinessLevel,
      jobRole: interview.jobRole
    });

    interview.strengths = report.strengths;
    interview.weaknesses = report.weaknesses;
    interview.actionableFeedback = report.actionableFeedback;

    await interview.save();

    return res.json({
      success: true,
      message: 'Interview completed successfully',
      data: {
        status: 'completed',
        finalScore: interview.finalScore,
        readinessLevel: interview.readinessLevel,
        performance: {
          totalQuestions: interview.performance.totalQuestions,
          questionsAnswered: interview.performance.questionsAnswered,
          averageScore: Math.round(interview.performance.averageScore)
        },
        reportId: interview._id
      }
    });
  }
}

export default new InterviewController();