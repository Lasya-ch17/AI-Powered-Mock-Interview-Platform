# Hack2Hire – AI Powered Mock Interview Platform (Backend)

This repository contains the **backend implementation** of an AI-Powered Mock Interview Platform built for the **Hack2Hire Interview Hackathon**.

The system simulates a real interview environment using AI by:
- Analyzing candidate resumes
- Aligning questions with job descriptions
- Conducting adaptive mock interviews
- Scoring performance objectively
- Generating interview readiness feedback

---

##  Features Implemented (Backend)

### Resume Analysis (Existing)
- Resume upload support (PDF / DOCX)
- Skill, experience, and project extraction

### AI Interview Engine
- AI-generated interview questions
- Difficulty levels: Easy → Medium → Hard
- Adaptive question difficulty based on answers
- Time-aware evaluation (logic-ready)
- Early interview termination logic (rule-based)

### Answer Evaluation
- Objective scoring based on:
  - Accuracy
  - Relevance
  - Clarity
  - Depth
- AI-generated feedback per answer

### Interview Readiness Score
- Final readiness score (0–100)
- Strengths & weaknesses
- Hiring readiness indicator for given JD

## Tech Stack

- **Node.js**
- **Express.js**
- **MongoDB**
- **OpenAI API**
- **Multer** (file uploads)
- **PDFJS / Mammoth** (resume parsing)
- **dotenv**

##  Project Structure
<img width="330" height="445" alt="image" src="https://github.com/user-attachments/assets/ea18a438-de66-4905-9075-694e755134ec" />


### API Endpoints (Interview Flow)
## Start Interview
POST /api/interview/start


## Body:

{
  "resumeData": {},
  "jdData": "Job description text"
}

## Submit Answer
POST /api/interview/submit


## Body:

{
  "sessionId": "session_id",
  "answer": "Candidate answer text"
}

## Finish Interview
POST /api/interview/finish


## Body:

{
  "sessionId": "session_id"
}




