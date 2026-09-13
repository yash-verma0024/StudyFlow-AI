const state = {
  fileId: '',
  filename: '',
  fileType: '',
  result: null,
  quiz: [],
  answers: {},
  quizSubmitted: false,
  currentStep: 'upload'
};

const elements = {
  fileInput: document.getElementById('fileInput'),
  subjectInput: document.getElementById('subjectInput'),
  uploadZone: document.getElementById('uploadZone'),
  uploadStatus: document.getElementById('uploadStatus'),
  fileList: document.getElementById('fileList'),
  resultsPanel: document.getElementById('resultsPanel'),
  notesContainer: document.getElementById('notesContainer'),
  quizPanel: document.getElementById('quizPanel'),
  quizContainer: document.getElementById('quizContainer'),
  scorePanel: document.getElementById('scorePanel'),
  scoreContainer: document.getElementById('scoreContainer'),
  practiceButton: document.getElementById('practiceButton'),
  examPaperButton: document.getElementById('examPaperButton'),
  downloadNotesButton: document.getElementById('downloadNotesButton'),
  downloadQuizButton: document.getElementById('downloadQuizButton'),
  copyNotesButton: document.getElementById('copyNotesButton'),
  resetButton: document.getElementById('resetButton'),
  youtubeButton: document.getElementById('youtubeButton')
};

function handleError(message) {
  elements.uploadStatus.textContent = message;
  elements.uploadStatus.style.color = '#c64242';
}

function setStatus(message, isError = false) {
  elements.uploadStatus.textContent = message;
  elements.uploadStatus.style.color = isError ? '#c64242' : '#5b6780';
}

function resetState() {
  state.fileId = '';
  state.filename = '';
  state.fileType = '';
  state.result = null;
  state.quiz = [];
  state.answers = {};
  state.quizSubmitted = false;
  state.currentStep = 'upload';

  elements.fileInput.value = '';
  elements.subjectInput.value = '';
  elements.fileList.innerHTML = '';
  elements.notesContainer.innerHTML = '';
  elements.quizContainer.innerHTML = '';
  elements.scoreContainer.innerHTML = '';
  elements.resultsPanel.classList.add('hidden');
  elements.quizPanel.classList.add('hidden');
  elements.scorePanel.classList.add('hidden');
  setStatus('');
}

function showFileList(file) {
  elements.fileList.innerHTML = `
    <div class="file-item">
      <div class="file-meta">
        <span class="file-name">${file.name}</span>
        <span class="file-subtext">${file.type || 'Unknown type'} • ${(file.size / 1024 / 1024).toFixed(2)} MB</span>
      </div>
      <button class="remove-file" type="button" data-remove="true">Remove</button>
    </div>
  `;

  const removeButton = elements.fileList.querySelector('[data-remove="true"]');
  removeButton.addEventListener('click', () => {
    resetState();
  });
}

async function uploadFile(file) {
  if (!file) {
    handleError('Please select a study material file.');
    return;
  }

  const allowedExtensions = ['pdf', 'docx', 'pptx', 'png', 'jpg', 'jpeg'];
  const ext = file.name.split('.').pop().toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    handleError('Unsupported file type. Please upload PDF, DOCX, PPTX, PNG, or JPG.');
    return;
  }

  if (file.size > 15 * 1024 * 1024) {
    handleError('File is too large. Please choose a file smaller than 15MB.');
    return;
  }

  setStatus('Uploading and extracting your material…');
  showFileList(file);

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Upload failed.');
    }

    state.fileId = data.file_id;
    state.filename = data.filename;
    state.fileType = data.file_type;

    setStatus('Material uploaded. Generating your revision notes and quiz…');

    const generateResponse = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        file_id: state.fileId,
        filename: state.filename,
        subject: elements.subjectInput.value.trim()
      })
    });

    const generatedData = await generateResponse.json();

    if (!generateResponse.ok) {
      throw new Error(generatedData.detail || 'Generation failed.');
    }

    state.result = generatedData.study_material;
    state.quiz = generatedData.study_material.quiz || [];

    renderNotes();
    setStatus('Study material generated successfully.');
  } catch (error) {
    handleError(error.message || 'Something went wrong while processing your file.');
  }
}

function renderNotes() {
  const material = state.result;
  elements.resultsPanel.classList.remove('hidden');
  state.currentStep = 'notes';

  if (!material) {
    elements.notesContainer.innerHTML = '<div class="empty-state">No study material yet.</div>';
    return;
  }

  const notesText = buildNotesText(material);
  const quizText = buildQuizText(material.quiz || []);

  elements.downloadNotesButton.disabled = false;
  elements.downloadQuizButton.disabled = false;
  elements.copyNotesButton.disabled = false;
  elements.examPaperButton.disabled = false;
  elements.downloadNotesButton.dataset.text = notesText;
  elements.downloadQuizButton.dataset.text = quizText;
  elements.copyNotesButton.dataset.text = notesText;
  elements.examPaperButton.dataset.text = buildExamPaperText(material);

  const topics = material.topics || [];
  const overview = material.overview || 'No overview available.';
  const importantTerms = material.important_terms || [];

  let html = `
    <div class="note-section">
      <h3>${material.title || 'Study Material'}</h3>
      <p>${overview}</p>
    </div>
  `;

  if (importantTerms.length) {
    html += `
      <div class="note-section">
        <h3>Important Terms</h3>
        <ul>
          ${importantTerms.map(term => `<li>${term}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  if (topics.length) {
    topics.forEach((topic) => {
      html += `
        <div class="note-section">
          <h3>${topic.title}</h3>
          <p>${topic.summary}</p>
          <div class="kv-grid">
            <div class="stat-card">
              <span class="stat-label">Key Points</span>
              <div class="stat-value">${(topic.key_points || []).length}</div>
            </div>
            <div class="stat-card">
              <span class="stat-label">Definitions</span>
              <div class="stat-value">${(topic.important_definitions || []).length}</div>
            </div>
            <div class="stat-card">
              <span class="stat-label">Exam Focus</span>
              <div class="stat-value">${(topic.exam_focus || []).length}</div>
            </div>
          </div>
          <h4>Key Points</h4>
          <ul>
            ${(topic.key_points || []).map(item => `<li>${item}</li>`).join('')}
          </ul>
          <h4>Important Definitions</h4>
          <ul>
            ${(topic.important_definitions || []).map(item => `<li>${item}</li>`).join('')}
          </ul>
          <h4>Key Facts</h4>
          <ul>
            ${(topic.key_facts || []).map(item => `<li>${item}</li>`).join('')}
          </ul>
          <h4>Exam-Focused Points</h4>
          <ul>
            ${(topic.exam_focus || []).map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      `;
    });
  } else {
    html += `
      <div class="note-section">
        <h3>Source Status</h3>
        <p>The uploaded material did not contain enough reliable content to generate notes and questions. Please try a clearer study document.</p>
      </div>
    `;
  }

  elements.notesContainer.innerHTML = html;
}

function buildNotesText(material) {
  const topics = material.topics || [];
  const lines = [
    `${material.title || 'Study Material'}`,
    '',
    `Overview: ${material.overview || ''}`,
    '',
    'Important Terms:',
    ...(material.important_terms || []).map((item) => `- ${item}`),
    ''
  ];

  topics.forEach((topic) => {
    lines.push(`Topic: ${topic.title}`);
    lines.push(`Summary: ${topic.summary}`);
    lines.push('Key Points:');
    (topic.key_points || []).forEach((point) => lines.push(`- ${point}`));
    lines.push('Important Definitions:');
    (topic.important_definitions || []).forEach((point) => lines.push(`- ${point}`));
    lines.push('Key Facts:');
    (topic.key_facts || []).forEach((point) => lines.push(`- ${point}`));
    lines.push('Exam Focus:');
    (topic.exam_focus || []).forEach((point) => lines.push(`- ${point}`));
    lines.push('');
  });

  return lines.join('\n');
}

function buildQuizText(quiz) {
  return quiz.map((item, index) => {
    const options = item.options.map((option) => `- ${option}`).join('\n');
    return `Q${index + 1}. ${item.question}\n${options}\nCorrect Answer: ${item.correct_answer}\nExplanation: ${item.explanation}`;
  }).join('\n\n');
}

function buildExamPaperText(material) {
  const topics = material.topics || [];
  return [
    'StudyFlow AI Exam Paper Draft',
    `Title: ${material.title || 'Study Material'}`,
    '',
    'Instructions:',
    '1. Answer all questions.',
    '2. Use only the uploaded material as your source.',
    '3. Keep answers concise and exam-focused.',
    '',
    'Section A: Short Answer',
    ...topics.map((topic, index) => `${index + 1}. Explain the concept of ${topic.title}.`),
    '',
    'Section B: Key Concepts',
    ...topics.map((topic, index) => `${index + 1}. List three important points from ${topic.title}.`),
    '',
    'Section C: Revision Check',
    ...(material.important_terms || []).slice(0, 5).map((term, index) => `${index + 1}. Define ${term}.`)
  ].join('\n');
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function renderQuiz() {
  if (!state.quiz.length) {
    elements.quizContainer.innerHTML = '<div class="empty-state">No quiz questions available.</div>';
    return;
  }

  const questions = state.quiz;
  let html = '';

  questions.forEach((question, index) => {
    html += `
      <div class="quiz-card">
        <h3>Question ${index + 1}</h3>
        <p>${question.question}</p>
        <div class="option-list">
          ${question.options.map((option) => `
            <label class="option-item">
              <input type="radio" name="question-${index}" value="${option}" data-question-index="${index}" />
              <span>${option}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  });

  html += `
    <div class="quiz-actions">
      <button class="primary-button" id="submitQuizButton" type="button">Submit Quiz</button>
    </div>
  `;

  elements.quizContainer.innerHTML = html;
  elements.quizPanel.classList.remove('hidden');

  const submitButton = document.getElementById('submitQuizButton');
  submitButton.addEventListener('click', submitQuiz);
}

async function submitQuiz() {
  const answers = {};
  const questionInputs = document.querySelectorAll('input[type="radio"]:checked');

  questionInputs.forEach((input) => {
    answers[input.dataset.questionIndex] = input.value;
  });

  if (Object.keys(answers).length !== state.quiz.length) {
    setStatus('Please answer all 5 questions before submitting.', true);
    return;
  }

  state.answers = answers;
  setStatus('Scoring your quiz…');

  try {
    const response = await fetch('/api/quiz/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        answers,
        quiz: state.quiz
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Quiz evaluation failed.');
    }

    renderScore(data);
    setStatus('Quiz submitted successfully.');
    state.quizSubmitted = true;
  } catch (error) {
    handleError(error.message || 'Failed to score your quiz.');
  }
}

function renderScore(result) {
  const { score, total, percentage, results } = result;

  elements.scorePanel.classList.remove('hidden');

  let html = `
    <div class="result-card">
      <div class="score-header">
        <div>
          <p class="eyebrow">Results</p>
          <div class="score-number">${score} / ${total}</div>
        </div>
        <div class="score-number">${percentage}%</div>
      </div>
      <div class="result-list">
  `;

  results.forEach((item) => {
    const rowClass = item.is_correct ? 'correct' : 'incorrect';
    html += `
      <div class="result-row ${rowClass}">
        <h4>Question ${item.question_number}</h4>
        <p><strong>Your answer:</strong> ${item.selected_answer || 'No answer selected'}</p>
        <p><strong>Correct answer:</strong> ${item.correct_answer}</p>
        <p><strong>Explanation:</strong> ${item.explanation}</p>
      </div>
    `;
  });

  html += `
      </div>
      <div class="score-actions">
        <button class="primary-button" id="tryAgainButton" type="button">Try Again</button>
        <button class="secondary-button" id="backToNotesButton" type="button">Back to Notes</button>
      </div>
    </div>
  `;

  elements.scoreContainer.innerHTML = html;

  document.getElementById('tryAgainButton').addEventListener('click', () => {
    state.answers = {};
    state.quizSubmitted = false;
    renderQuiz();
    elements.scorePanel.classList.add('hidden');
  });

  document.getElementById('backToNotesButton').addEventListener('click', () => {
    elements.scorePanel.classList.add('hidden');
    elements.quizPanel.classList.add('hidden');
    elements.resultsPanel.classList.remove('hidden');
  });
}

function bindEvents() {
  elements.fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      uploadFile(file);
    }
  });

  elements.practiceButton.addEventListener('click', () => {
    renderQuiz();
    elements.resultsPanel.classList.add('hidden');
    elements.quizPanel.classList.remove('hidden');
  });

  elements.downloadNotesButton.addEventListener('click', () => {
    const text = elements.downloadNotesButton.dataset.text || '';
    if (text) {
      downloadText('studyflow-notes.txt', text);
    }
  });

  elements.downloadQuizButton.addEventListener('click', () => {
    const text = elements.downloadQuizButton.dataset.text || '';
    if (text) {
      downloadText('studyflow-quiz.txt', text);
    }
  });

  elements.copyNotesButton.addEventListener('click', async () => {
    const text = elements.copyNotesButton.dataset.text || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Notes copied to clipboard.');
    } catch (error) {
      setStatus('Copy failed. You can still download the notes instead.', true);
    }
  });

  elements.examPaperButton.addEventListener('click', () => {
    const text = elements.examPaperButton.dataset.text || '';
    if (text) {
      downloadText('studyflow-exam-paper.txt', text);
    }
  });

  elements.resetButton.addEventListener('click', () => {
    resetState();
  });

  elements.youtubeButton.addEventListener('click', () => {
    const youtubeLink = prompt('Paste a YouTube link');
    if (youtubeLink) {
      setStatus('YouTube links are coming soon. Please use PDF, DOCX, PPTX, PNG, or JPG for the guaranteed demo flow.', true);
    }
  });

  ['dragenter', 'dragover'].forEach((eventName) => {
    elements.uploadZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.uploadZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    elements.uploadZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.uploadZone.classList.remove('dragover');
    });
  });

  elements.uploadZone.addEventListener('drop', (event) => {
    const file = event.dataTransfer.files[0];
    if (file) {
      uploadFile(file);
    }
  });
}

bindEvents();
