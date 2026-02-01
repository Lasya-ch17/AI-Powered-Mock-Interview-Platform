import mongoose from 'mongoose';

const interviewSchema = new mongoose.Schema({
  candidateId: {
    type: String,
    required: true
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CV_Collection'
  },
  jobDescription: {
    type: String,
    required: true
  },
  jobRole: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'terminated'],
    default: 'in-progress'
  },
  currentDifficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'easy'
  },
  questions: [{
    questionNumber: Number,
    question: String,
    difficulty: String,
    category: {
      type: String,
      enum: ['technical', 'behavioral', 'conceptual', 'scenario']
    },
    askedAt: Date,
    answer: String,
    answeredAt: Date,
    timeTaken: Number, // in seconds
    timeAllowed: Number, // in seconds
    score: {
      accuracy: Number,
      clarity: Number,
      depth: Number,
      relevance: Number,
      timeEfficiency: Number,
      overall: Number
    },
    feedback: String,
    expectedKeyPoints: [String]
  }],
  performance: {
    totalQuestions: { type: Number, default: 0 },
    questionsAnswered: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    timeManagement: { type: Number, default: 0 },
    technicalScore: { type: Number, default: 0 },
    behavioralScore: { type: Number, default: 0 },
    conceptualScore: { type: Number, default: 0 },
    scenarioScore: { type: Number, default: 0 }
  },
  finalScore: {
    type: Number,
    min: 0,
    max: 100
  },
  readinessLevel: {
    type: String,
    enum: ['Strong', 'Average', 'Needs Improvement']
  },
  strengths: [String],
  weaknesses: [String],
  actionableFeedback: [String],
  terminationReason: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date
});

// Calculate final score and readiness
interviewSchema.methods.calculateFinalScore = function() {
  if (this.questions.length === 0) return 0;

  const weights = {
    averageScore: 0.4,
    timeManagement: 0.2,
    technicalScore: 0.2,
    behavioralScore: 0.1,
    conceptualScore: 0.1
  };

  this.finalScore = Math.round(
    (this.performance.averageScore * weights.averageScore) +
    (this.performance.timeManagement * weights.timeManagement) +
    (this.performance.technicalScore * weights.technicalScore) +
    (this.performance.behavioralScore * weights.behavioralScore) +
    (this.performance.conceptualScore * weights.conceptualScore)
  );

  // Determine readiness level
  if (this.finalScore >= 75) {
    this.readinessLevel = 'Strong';
  } else if (this.finalScore >= 50) {
    this.readinessLevel = 'Average';
  } else {
    this.readinessLevel = 'Needs Improvement';
  }

  return this.finalScore;
};

export default mongoose.model('Interview', interviewSchema);