import OpenAI from 'openai';

class QuestionGenerator {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Generate interview question based on resume, JD, difficulty, and previous performance
   */
  async generateQuestion(params) {
    const {
      resumeData,
      jobDescription,
      jobRole,
      difficulty,
      category,
      previousQuestions,
      previousPerformance
    } = params;

    const prompt = this.buildPrompt({
      resumeData,
      jobDescription,
      jobRole,
      difficulty,
      category,
      previousQuestions,
      previousPerformance
    });

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert technical interviewer. Generate realistic, relevant interview questions based on the candidate's resume and job description. Questions should be:
- Clear and specific
- Appropriate for the difficulty level
- Aligned with the job requirements
- Progressive (building on previous questions if applicable)
- Professional and unbiased

Return ONLY a JSON object with this structure:
{
  "question": "the interview question",
  "expectedKeyPoints": ["point1", "point2", "point3"],
  "timeAllowed": 120,
  "category": "technical|behavioral|conceptual|scenario",
  "difficulty": "easy|medium|hard"
}`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const content = response.choices[0].message.content.trim();
      
      // Parse JSON response
      let questionData;
      try {
        questionData = JSON.parse(content);
      } catch (e) {
        // Fallback if not valid JSON
        questionData = {
          question: content,
          expectedKeyPoints: [],
          timeAllowed: this.getDefaultTimeAllowed(difficulty),
          category: category,
          difficulty: difficulty
        };
      }

      return questionData;
    } catch (error) {
      console.error('Error generating question:', error);
      throw new Error('Failed to generate interview question');
    }
  }

  /**
   * Evaluate candidate's answer
   */
  async evaluateAnswer(params) {
    const {
      question,
      answer,
      expectedKeyPoints,
      difficulty,
      category,
      timeTaken,
      timeAllowed
    } = params;

    const prompt = `You are an expert interviewer evaluating a candidate's response.

QUESTION: ${question}
EXPECTED KEY POINTS: ${expectedKeyPoints.join(', ')}
DIFFICULTY LEVEL: ${difficulty}
CATEGORY: ${category}

CANDIDATE'S ANSWER: ${answer}

TIME TAKEN: ${timeTaken} seconds (Allowed: ${timeAllowed} seconds)

Evaluate this answer and provide scores (0-100) for:
1. Accuracy - How correct and factual is the answer?
2. Clarity - How clear and well-structured is the response?
3. Depth - How thorough and comprehensive is the answer?
4. Relevance - How well does it address the question?
5. Time Efficiency - Was the answer provided within time constraints?

Also provide:
- Overall score (0-100)
- Brief feedback (2-3 sentences)
- Whether to increase, decrease, or maintain difficulty for next question

Return ONLY a JSON object with this structure:
{
  "scores": {
    "accuracy": 85,
    "clarity": 80,
    "depth": 75,
    "relevance": 90,
    "timeEfficiency": 70,
    "overall": 80
  },
  "feedback": "Your feedback here",
  "nextDifficulty": "maintain|increase|decrease"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert interviewer providing objective, constructive evaluation of candidate responses. Be fair but honest in your assessment.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 600
      });

      const content = response.choices[0].message.content.trim();
      const evaluation = JSON.parse(content);

      return evaluation;
    } catch (error) {
      console.error('Error evaluating answer:', error);
      throw new Error('Failed to evaluate answer');
    }
  }

  /**
   * Generate final interview report
   */
  async generateFinalReport(interviewData) {
    const {
      questions,
      performance,
      finalScore,
      readinessLevel,
      jobRole
    } = interviewData;

    const prompt = `Generate a comprehensive interview performance report.

JOB ROLE: ${jobRole}
FINAL SCORE: ${finalScore}/100
READINESS LEVEL: ${readinessLevel}

PERFORMANCE METRICS:
- Total Questions: ${performance.totalQuestions}
- Questions Answered: ${performance.questionsAnswered}
- Average Score: ${performance.averageScore}
- Time Management: ${performance.timeManagement}
- Technical Score: ${performance.technicalScore}
- Behavioral Score: ${performance.behavioralScore}

QUESTION HISTORY:
${questions.map((q, idx) => `
Question ${idx + 1} (${q.difficulty} - ${q.category}):
Q: ${q.question}
A: ${q.answer}
Score: ${q.score?.overall || 'N/A'}
`).join('\n')}

Provide:
1. Top 3-5 Strengths
2. Top 3-5 Weaknesses/Areas for Improvement
3. 5-7 Actionable recommendations
4. Hiring readiness assessment for the role

Return ONLY a JSON object:
{
  "strengths": ["strength1", "strength2", ...],
  "weaknesses": ["weakness1", "weakness2", ...],
  "actionableFeedback": ["recommendation1", "recommendation2", ...],
  "hiringReadiness": "ready|conditional|not-ready",
  "hiringReadinessExplanation": "Brief explanation"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert hiring manager providing detailed, actionable feedback to help candidates improve.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 1000
      });

      const content = response.choices[0].message.content.trim();
      const report = JSON.parse(content);

      return report;
    } catch (error) {
      console.error('Error generating report:', error);
      throw new Error('Failed to generate final report');
    }
  }

  buildPrompt(params) {
    const {
      resumeData,
      jobDescription,
      jobRole,
      difficulty,
      category,
      previousQuestions,
      previousPerformance
    } = params;

    let prompt = `Generate an interview question for the following:

JOB ROLE: ${jobRole}
JOB DESCRIPTION: ${jobDescription}

CANDIDATE RESUME:
Skills: ${resumeData.skills?.join(', ') || 'N/A'}
Experience: ${resumeData.experience || 'N/A'}
Education: ${resumeData.education || 'N/A'}
Projects: ${resumeData.projects || 'N/A'}

QUESTION REQUIREMENTS:
- Difficulty Level: ${difficulty}
- Category: ${category}
- Time Limit: ${this.getDefaultTimeAllowed(difficulty)} seconds
`;

    if (previousQuestions && previousQuestions.length > 0) {
      prompt += `\nPREVIOUS QUESTIONS (avoid repetition):
${previousQuestions.map((q, idx) => `${idx + 1}. ${q}`).join('\n')}
`;
    }

    if (previousPerformance) {
      prompt += `\nCANDIDATE'S PREVIOUS PERFORMANCE:
Average Score: ${previousPerformance.averageScore || 'N/A'}
Last Question Score: ${previousPerformance.lastScore || 'N/A'}
`;
    }

    return prompt;
  }

  getDefaultTimeAllowed(difficulty) {
    const timeLimits = {
      easy: 90,      // 1.5 minutes
      medium: 120,   // 2 minutes
      hard: 180      // 3 minutes
    };
    return timeLimits[difficulty] || 120;
  }

  determineNextDifficulty(currentDifficulty, performanceIndicator) {
    const difficultyLevels = ['easy', 'medium', 'hard'];
    const currentIndex = difficultyLevels.indexOf(currentDifficulty);

    if (performanceIndicator === 'increase' && currentIndex < 2) {
      return difficultyLevels[currentIndex + 1];
    } else if (performanceIndicator === 'decrease' && currentIndex > 0) {
      return difficultyLevels[currentIndex - 1];
    }

    return currentDifficulty;
  }

  determineQuestionCategory(questionNumber, totalQuestions = 10) {
    // Distribute question categories throughout the interview
    const categories = ['technical', 'conceptual', 'behavioral', 'scenario'];
    
    if (questionNumber <= 3) {
      return questionNumber % 2 === 0 ? 'technical' : 'conceptual';
    } else if (questionNumber <= 7) {
      return questionNumber % 2 === 0 ? 'technical' : 'scenario';
    } else {
      return questionNumber % 2 === 0 ? 'behavioral' : 'technical';
    }
  }
}

export default QuestionGenerator;