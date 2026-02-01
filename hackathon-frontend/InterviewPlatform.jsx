import React, { useState, useEffect } from 'react';
import './InterviewPlatform.css'; // You'll need to create this

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/interview';

const InterviewPlatform = () => {
  // State management
  const [stage, setStage] = useState('setup'); // setup, interview, report
  const [interviewId, setInterviewId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Setup form data
  const [setupData, setSetupData] = useState({
    candidateId: '',
    resumeId: '',
    jobRole: '',
    jobDescription: ''
  });

  // Timer effect
  useEffect(() => {
    if (stage === 'interview' && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [stage, timeRemaining]);

  // Start interview
  const handleStartInterview = async () => {
    if (!setupData.candidateId || !setupData.resumeId || !setupData.jobRole || !setupData.jobDescription) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setupData)
      });

      const data = await response.json();

      if (data.success) {
        setInterviewId(data.data.interviewId);
        setCurrentQuestion(data.data.currentQuestion);
        setTimeRemaining(data.data.currentQuestion.timeAllowed);
        setStage('interview');
      } else {
        setError(data.message || 'Failed to start interview');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit answer
  const handleSubmitAnswer = async () => {
    if (!answer.trim()) {
      setError('Please provide an answer');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/submit-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewId,
          questionNumber: currentQuestion.questionNumber,
          answer: answer.trim()
        })
      });

      const data = await response.json();

      if (data.success) {
        // Show feedback
        setFeedback(data.data.currentQuestionFeedback);

        // Check if interview is complete
        if (!data.data.nextQuestion) {
          // Interview completed, fetch report
          setTimeout(() => fetchReport(), 2000);
        } else {
          // Show next question after 3 seconds
          setTimeout(() => {
            setCurrentQuestion(data.data.nextQuestion);
            setTimeRemaining(data.data.nextQuestion.timeAllowed);
            setAnswer('');
            setFeedback(null);
          }, 3000);
        }
      } else {
        setError(data.message || 'Failed to submit answer');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit when time runs out
  const handleAutoSubmit = () => {
    if (answer.trim()) {
      handleSubmitAnswer();
    } else {
      setAnswer('Time expired - No answer provided');
      handleSubmitAnswer();
    }
  };

  // Fetch final report
  const fetchReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/report/${interviewId}`);
      const data = await response.json();

      if (data.success) {
        setReport(data.data);
        setStage('report');
      } else {
        setError(data.message || 'Failed to fetch report');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Render setup screen
  const renderSetup = () => (
    <div className="setup-screen">
      <h1>🎯 AI-Powered Mock Interview</h1>
      <p>Get ready for your interview! Fill in the details below to start.</p>

      <div className="form-group">
        <label>Candidate ID</label>
        <input
          type="text"
          value={setupData.candidateId}
          onChange={(e) => setSetupData({ ...setupData, candidateId: e.target.value })}
          placeholder="Enter your candidate ID"
        />
      </div>

      <div className="form-group">
        <label>Resume ID</label>
        <input
          type="text"
          value={setupData.resumeId}
          onChange={(e) => setSetupData({ ...setupData, resumeId: e.target.value })}
          placeholder="Enter your resume ID"
        />
      </div>

      <div className="form-group">
        <label>Job Role</label>
        <input
          type="text"
          value={setupData.jobRole}
          onChange={(e) => setSetupData({ ...setupData, jobRole: e.target.value })}
          placeholder="e.g., Full Stack Developer"
        />
      </div>

      <div className="form-group">
        <label>Job Description</label>
        <textarea
          value={setupData.jobDescription}
          onChange={(e) => setSetupData({ ...setupData, jobDescription: e.target.value })}
          placeholder="Paste the job description here..."
          rows="8"
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      <button
        onClick={handleStartInterview}
        disabled={loading}
        className="primary-button"
      >
        {loading ? 'Starting...' : 'Start Interview'}
      </button>
    </div>
  );

  // Render interview screen
  const renderInterview = () => (
    <div className="interview-screen">
      <div className="interview-header">
        <h2>Interview in Progress</h2>
        <div className="timer">
          ⏱️ Time Remaining: <span className={timeRemaining < 30 ? 'warning' : ''}>{timeRemaining}s</span>
        </div>
      </div>

      {feedback && (
        <div className="feedback-box">
          <h3>✅ Feedback on Previous Answer</h3>
          <p><strong>Score:</strong> {feedback.score}/100</p>
          <p>{feedback.feedback}</p>
        </div>
      )}

      {currentQuestion && (
        <div className="question-box">
          <div className="question-meta">
            <span className="question-number">Question {currentQuestion.questionNumber}</span>
            <span className={`difficulty ${currentQuestion.difficulty}`}>
              {currentQuestion.difficulty.toUpperCase()}
            </span>
            <span className="category">{currentQuestion.category}</span>
          </div>
          <p className="question-text">{currentQuestion.question}</p>
        </div>
      )}

      <div className="answer-section">
        <label>Your Answer:</label>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer here..."
          rows="10"
          disabled={loading || feedback !== null}
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      <button
        onClick={handleSubmitAnswer}
        disabled={loading || !answer.trim() || feedback !== null}
        className="primary-button"
      >
        {loading ? 'Submitting...' : 'Submit Answer'}
      </button>
    </div>
  );

  // Render report screen
  const renderReport = () => (
    <div className="report-screen">
      <h1>📊 Interview Performance Report</h1>

      <div className="score-card">
        <div className="final-score">
          <h2>{report.finalScore}/100</h2>
          <p className={`readiness-level ${report.readinessLevel.toLowerCase().replace(' ', '-')}`}>
            {report.readinessLevel}
          </p>
        </div>

        <div className="performance-metrics">
          <div className="metric">
            <span className="label">Questions Answered:</span>
            <span className="value">{report.performance.questionsAnswered}/{report.performance.totalQuestions}</span>
          </div>
          <div className="metric">
            <span className="label">Average Score:</span>
            <span className="value">{report.performance.averageScore}%</span>
          </div>
          <div className="metric">
            <span className="label">Time Management:</span>
            <span className="value">{report.performance.timeManagement}%</span>
          </div>
          <div className="metric">
            <span className="label">Technical Score:</span>
            <span className="value">{report.performance.technicalScore}%</span>
          </div>
          <div className="metric">
            <span className="label">Behavioral Score:</span>
            <span className="value">{report.performance.behavioralScore}%</span>
          </div>
        </div>
      </div>

      <div className="feedback-sections">
        <div className="feedback-section">
          <h3>💪 Strengths</h3>
          <ul>
            {report.strengths.map((strength, idx) => (
              <li key={idx}>{strength}</li>
            ))}
          </ul>
        </div>

        <div className="feedback-section">
          <h3>📈 Areas for Improvement</h3>
          <ul>
            {report.weaknesses.map((weakness, idx) => (
              <li key={idx}>{weakness}</li>
            ))}
          </ul>
        </div>

        <div className="feedback-section">
          <h3>🎯 Actionable Feedback</h3>
          <ul>
            {report.actionableFeedback.map((feedback, idx) => (
              <li key={idx}>{feedback}</li>
            ))}
          </ul>
        </div>
      </div>

      <button
        onClick={() => {
          setStage('setup');
          setInterviewId(null);
          setCurrentQuestion(null);
          setAnswer('');
          setFeedback(null);
          setReport(null);
          setSetupData({ candidateId: '', resumeId: '', jobRole: '', jobDescription: '' });
        }}
        className="primary-button"
      >
        Start New Interview
      </button>
    </div>
  );

  // Main render
  return (
    <div className="interview-platform">
      {stage === 'setup' && renderSetup()}
      {stage === 'interview' && renderInterview()}
      {stage === 'report' && renderReport()}
    </div>
  );
};

export default InterviewPlatform;
