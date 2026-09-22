// ═══════════════════════════════════════
// PART 1 — VARIABLES & TAB SWITCHING
// ═══════════════════════════════════════

// Store all evaluations done this session
const sessionHistory = [];
let resultsVisible = false;

// Get all elements we need from index.html
const tabSingle    = document.getElementById('tab-single');
const tabHistory   = document.getElementById('tab-history');
const panelSingle  = document.getElementById('panel-single');
const panelResults = document.getElementById('panel-results');
const panelHistory = document.getElementById('panel-history');
const evaluateBtn  = document.getElementById('evaluate-btn');
const errorMessage = document.getElementById('error-message');
const inputQuestion = document.getElementById('input-question');
const inputAnswer   = document.getElementById('input-answer');
const inputResponse = document.getElementById('input-response');
const charCount     = document.getElementById('char-count');

// Update character count as user types in AI Response field
inputResponse.addEventListener('input', function () {
  charCount.textContent = this.value.length + ' characters';
});

// Single Evaluation tab click
tabSingle.addEventListener('click', function () {
  tabSingle.classList.add('active');
  tabHistory.classList.remove('active');
  panelSingle.style.display  = 'block';
  panelHistory.style.display = 'none';
  if (resultsVisible) {
    panelResults.style.display = 'block';
  }
});

// History tab click
tabHistory.addEventListener('click', function () {
  tabHistory.classList.add('active');
  tabSingle.classList.remove('active');
  panelSingle.style.display  = 'none';
  panelResults.style.display = 'none';
  panelHistory.style.display = 'block';
  renderHistory();
});



// ═══════════════════════════════════════
// PART 2 — FORM VALIDATION
// ═══════════════════════════════════════

// Show error message
function showError(message) {
  errorMessage.textContent = '⚠  ' + message;
  errorMessage.classList.add('show');
}

// Hide error message
function hideError() {
  errorMessage.classList.remove('show');
}

// When Evaluate button is clicked
evaluateBtn.addEventListener('click', function () {

  // Read values from all 3 fields
  const question = inputQuestion.value.trim();
  const answer   = inputAnswer.value.trim();
  const response = inputResponse.value.trim();

  // Hide any previous error first
  hideError();

  // Check each field one by one
  if (!question) {
    showError('Please enter the math question.');
    return;
  }

  if (!answer) {
    showError('Please enter the correct answer.');
    return;
  }

  if (!response) {
    showError('Please paste the AI response to evaluate.');
    return;
  }

  // All 3 fields are filled — call the evaluation function
  runEvaluation(question, answer, response);

});




// ═══════════════════════════════════════
// PART 3 — BUILD PROMPT & CALL API
// ═══════════════════════════════════════

// Build the evaluation prompt with user inputs
function buildPrompt(question, answer, response) {
  return `You are an expert math evaluator. Evaluate the AI-generated math
response below using a structured 8-point rubric.

INPUTS:
Math Question   : ${question}
Correct Answer  : ${answer}
AI Response     : ${response}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1 — CHECK ALL 8 STRUCTURAL POINTS

Read the AI response carefully and check each point below.
Use only these four status values for each point:
present_correct | present_incorrect | missing | not_applicable

─────────────────────────────────────────
P1 — GIVEN VALUES (Mandatory)
Did the response clearly mention all given values at the start?
present_correct   → All given values correctly listed at the start
present_incorrect → Given values listed but one or more are wrong
missing           → No given values mentioned at all

─────────────────────────────────────────
P2 — WHAT TO FIND (Mandatory)
Did the response identify what needs to be found or solved?
present_correct   → Clearly stated the unknown or goal before solving
present_incorrect → Identified the wrong target variable or quantity
missing           → Never stated what needs to be found

─────────────────────────────────────────
P3 — CONCEPT EXPLANATION (Optional)
Did the response explain the concept, method, or principle needed?
present_correct   → Relevant concept explained clearly and correctly
present_incorrect → Wrong or irrelevant concept explained
missing           → Concept not explained (penalise for complex problems)
not_applicable    → Simple direct problem where concept is obvious

─────────────────────────────────────────
P4 — VARIABLE ASSUMPTION (Optional)
Did the response define variables (x, y, p, q etc.) where needed?
present_correct   → Variables clearly assumed and correctly used
                    throughout the working
present_incorrect → Variables assumed incorrectly or used
                    inconsistently in the working
missing           → Variables needed but never defined
not_applicable    → Problem does not require variable assumption

─────────────────────────────────────────
P5 — FORMULA AND TERMS (Optional)
Did the response state the correct formula and explain its terms?
present_correct   → Correct formula clearly stated. Each term in
                    the formula explained or labelled properly
present_incorrect → Wrong formula used. OR correct formula stated
                    but none of its terms explained
missing           → Formula needed but not mentioned at all
not_applicable    → Direct arithmetic where no formula is required

─────────────────────────────────────────
P6 — SUBSTITUTION AND WORKING (Mandatory)
Did the response substitute values and show full step-by-step working?
present_correct   → All values correctly substituted into the formula.
                    Every step of the working shown clearly with
                    correct arithmetic throughout
present_incorrect → Substitution attempted but contains arithmetic
                    errors, wrong values used, sign mistakes, or
                    steps missing in the middle of working
missing           → Only a final answer stated with no working shown

─────────────────────────────────────────
P7 — MATHEMATICAL SYMBOL USAGE (Mandatory)
Check symbol correctness across ALL steps of the entire response.

Currency  : ₹ must be used — not Rs., INR, or "rupees"
Powers    : ², ³, ⁴ must be used — not ^2, ^3, "squared", "cubed"
Multiply  : × or x must be used — not *  for multiplication
Root      : √ must be used — not sqrt() or "root of"
Pi        : π must be used in formulas — not "pi" or 3.14159
Units     : abbreviated form required (km, m, cm, kg, g, %, L, mL)
            not written out as full words (kilometers, meters, percent)

present_correct   → All symbols used correctly throughout all steps
present_incorrect → Some symbols correct but one or more violations
                    found anywhere in the response
missing           → Symbols completely absent

─────────────────────────────────────────
P8 — FINAL CONCLUSION (Mandatory)
Did the response state a clear final conclusion with correct units?
present_correct   → Final answer clearly stated, matches the correct
                    answer, and includes correct units or currency
                    symbol (₹, km, kg, cm² etc.)
present_incorrect → Final answer stated but is numerically wrong. OR
                    correct number given without units or ₹ symbol
missing           → Response ended without stating any final answer

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 2 — ASSIGN SCORES BASED ON STRUCTURAL POINTS

─────────────────────────────────────────
CORRECTNESS SCORE (0–5)
Based on accuracy of mandatory points P1, P6, P7, P8
and optional point P5 where applicable:

5 → P1 present_correct + P6 present_correct +
    P7 present_correct + P8 present_correct.
    Final answer exactly matches correct answer with correct
    units and symbols used throughout.

4 → Final answer is correct. One minor issue only, such as:
    · Small arithmetic slip in P6 that was self-corrected
    · P7 has exactly one minor symbol violation
    · P8 has the correct number but is missing unit or ₹

3 → P1 and P6 show the correct method but P8 is wrong due
    to a calculation error at the very last step only.

2 → Some mandatory points present but P6 or P8 is incorrect.
    Wrong final answer even with partial working shown.

1 → Only one mandatory point present and correct.
    Mostly wrong. OR correct answer given but P6 is missing
    entirely and P7 is also missing.

0 → No mandatory points present at all. Completely wrong
    answer. OR response is a guess with no mathematical
    working shown.

─────────────────────────────────────────
REASONING SCORE (0–5)
Based on logical flow through P2, P3, P4, P5:

5 → P2 clearly stated. All applicable optional points
    (P3, P4, P5) present and correct. Logical flow
    from problem identification to solution is complete.

4 → P2 clearly stated. One applicable optional point
    missing but remaining reasoning is solid and connected.

3 → P2 present. Two applicable optional points missing.
    Core logic still visible through the working in P6.

2 → P2 unclear or missing. Major reasoning gaps present.
    Hard to understand the intent behind the working shown.

1 → No clear problem identification. P2 absent.
    Reasoning largely flawed or disconnected between steps.

0 → No logical structure at all. Response is irrelevant
    to the question or reasoning is completely absent.

─────────────────────────────────────────
CLARITY SCORE (0–5)
Based on two things together:
(a) How well the response follows the 8-point sequence
    in the correct order: P1→P2→P3→P4→P5→P6→P7→P8
(b) Quality of mathematical symbol usage throughout (P7)

5 → All applicable points present and in correct sequence.
    P7 = present_correct. Symbols used correctly throughout.

4 → All applicable points present. One of:
    · One point slightly out of sequence or poorly labelled
    · P7 has 1–2 minor violations only

3 → 5–6 applicable points present. Somewhat disorganised.
    OR P7 = present_incorrect with multiple symbol issues.

2 → Only 3–4 applicable points present. Hard to follow.
    OR correct sequence but P7 = missing entirely.

1 → Only 1–2 applicable points present. Very poor structure.

0 → No discernible structure at all. Cannot be followed.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 3 — CLASSIFY THE ERROR TYPE

Pick exactly one from the 10 types below.
If two or more types apply, choose the most important one.

No Error
Structural Error
Conceptual Error
Methodology Error
Calculation Error
Sign Error
Unit Error
Symbol Error
Incomplete Solution

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 4 — CALCULATE FINAL SCORE

Final Score = (Correctness × 0.5 + Reasoning × 0.3 + Clarity × 0.2) × 20
Round to one decimal place. Result is between 0.0 and 100.0.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return ONLY a valid JSON object.
No text before or after it.
No markdown. No backticks. No explanation outside the JSON.

{
  "structure_check": {
    "P1_given_values": "",
    "P2_what_to_find": "",
    "P3_concept": "",
    "P4_variable_assumption": "",
    "P5_formula_terms": "",
    "P6_substitution_working": "",
    "P7_symbol_usage": "",
    "P8_final_conclusion": ""
  },
  "correctness_score": 0,
  "reasoning_score": 0,
  "clarity_score": 0,
  "error_type": "",
  "final_score": 0.0,
  "explanation": ""
}`;
}


// Send prompt to Flask server and get result back
async function runEvaluation(question, answer, response) {

  // Show loading state on button
  evaluateBtn.disabled    = true;
  evaluateBtn.textContent = '⏳  Evaluating...';
  hideError();

  // Hide previous results
  panelResults.style.display = 'none';

  try {

    // Build the prompt
    const prompt = buildPrompt(question, answer, response);

    // Send to Flask server
    const serverResponse = await fetch('http://localhost:5000/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt })
    });

    // Check server responded correctly
    if (!serverResponse.ok) {
      throw new Error('Server error: ' + serverResponse.status);
    }

    // Get the result from server
    const data = await serverResponse.json();

    // Check for error from server
    if (data.error) {
      throw new Error(data.error);
    }

    // Parse the JSON string returned by Claude
    const result = JSON.parse(data.result);

    // Save to history
    sessionHistory.unshift({
      question:          question,
      answer:            answer,
      response:          response,
      correctness_score: result.correctness_score,
      reasoning_score:   result.reasoning_score,
      clarity_score:     result.clarity_score,
      error_type:        result.error_type,
      final_score:       result.final_score,
      explanation:       result.explanation,
      structure_check:   result.structure_check,
      time:              new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    // Show results on page
    displayResults(result);

  } catch (error) {

    // Show error to user
    showError('Something went wrong: ' + error.message + '. Make sure the server is running.');

  } finally {

    // Always restore button
    evaluateBtn.disabled    = false;
    evaluateBtn.textContent = '✦  Evaluate Response';

  }

}



// ═══════════════════════════════════════
// PART 4 — DISPLAY RESULTS ON PAGE
// ═══════════════════════════════════════

function displayResults(result) {

  resultsVisible = true;
  // ── Three score cards ──
  const correctnessEl = document.getElementById('score-correctness');
  const reasoningEl   = document.getElementById('score-reasoning');
  const clarityEl     = document.getElementById('score-clarity');

  correctnessEl.textContent = result.correctness_score;
  reasoningEl.textContent   = result.reasoning_score;
  clarityEl.textContent     = result.clarity_score;

  // Score card colours
  correctnessEl.style.color = getScoreColor(result.correctness_score);
  reasoningEl.style.color   = getScoreColor(result.reasoning_score);
  clarityEl.style.color     = getScoreColor(result.clarity_score);

  // ── Final score + progress bar ──
  const finalEl    = document.getElementById('score-final');
  const progressEl = document.getElementById('progress-fill');
  const finalScore = result.final_score;

  finalEl.textContent  = finalScore;
  finalEl.style.color  = getFinalColor(finalScore);

  // Animate progress bar after short delay
  setTimeout(function () {
    progressEl.style.width      = finalScore + '%';
    progressEl.style.background = getFinalColor(finalScore);
  }, 100);

  // ── Error type badge ──
  const badgeEl = document.getElementById('error-type-badge');
  badgeEl.textContent = result.error_type;
  badgeEl.className   = 'error-badge ' + getErrorBadgeClass(result.error_type);

  // ── Explanation ──
  document.getElementById('explanation-text').textContent = result.explanation;

  // ── P1–P8 structure check ──
  const sc = result.structure_check;

  setStatus('p1-status', sc.P1_given_values);
  setStatus('p2-status', sc.P2_what_to_find);
  setStatus('p3-status', sc.P3_concept);
  setStatus('p4-status', sc.P4_variable_assumption);
  setStatus('p5-status', sc.P5_formula_terms);
  setStatus('p6-status', sc.P6_substitution_working);
  setStatus('p7-status', sc.P7_symbol_usage);
  setStatus('p8-status', sc.P8_final_conclusion);

  // ── Show results panel ──
  panelResults.style.display = 'block';

  // ── Scroll down to results ──
  panelResults.scrollIntoView({ behavior: 'smooth', block: 'start' });

}

// Set colour and text for each P1–P8 status badge
function setStatus(elementId, statusValue) {
  const el = document.getElementById(elementId);

  // Format the text nicely
  const labels = {
    'present_correct':   'Present ✓',
    'present_incorrect': 'Incorrect ✗',
    'missing':           'Missing',
    'not_applicable':    'N/A'
  };

  el.textContent = labels[statusValue] || statusValue || '–';

  // Remove all status classes first
  el.classList.remove('status-correct', 'status-incorrect', 'status-missing', 'status-na');

  // Add the correct class
  if (statusValue === 'present_correct')   el.classList.add('status-correct');
  if (statusValue === 'present_incorrect') el.classList.add('status-incorrect');
  if (statusValue === 'missing')           el.classList.add('status-missing');
  if (statusValue === 'not_applicable')    el.classList.add('status-na');
}

// Return colour based on score 0–5
function getScoreColor(score) {
  if (score >= 4) return '#4ade80';
  if (score >= 3) return '#fbbf24';
  return '#f87171';
}

// Return colour based on final score 0–100
function getFinalColor(score) {
  if (score >= 75) return '#4ade80';
  if (score >= 50) return '#fbbf24';
  return '#f87171';
}

// Return badge CSS class based on error type
function getErrorBadgeClass(errorType) {
  if (errorType === 'No Error')                        return 'badge-green';
  if (errorType === 'Calculation Error')               return 'badge-yellow';
  if (errorType === 'Sign Error')                      return 'badge-yellow';
  if (errorType === 'Unit Error')                      return 'badge-yellow';
  if (errorType === 'Symbol Error')                    return 'badge-blue';
  if (errorType === 'Incomplete Solution')             return 'badge-purple';
  if (errorType === 'Structural Error')                return 'badge-purple';
  if (errorType === 'Conceptual Error')                return 'badge-red';
  if (errorType === 'Methodology Error')               return 'badge-red';
  if (errorType === 'Multiple Errors')                 return 'badge-red';
  return 'badge-blue';
}

// ═══════════════════════════════════════
// PART 5 — HISTORY
// ═══════════════════════════════════════

function renderHistory() {

  const historyList = document.getElementById('history-list');

  if (sessionHistory.length === 0) {
    historyList.innerHTML = '<div class="empty-state">No evaluations yet. Run your first evaluation to see history here.</div>';
    return;
  }

  let html = '';

  for (let i = 0; i < sessionHistory.length; i++) {
    const item  = sessionHistory[i];
    const score = item.final_score;
    const color = score >= 75 ? '#4ade80' : score >= 50 ? '#fbbf24' : '#f87171';

    html += '<div class="history-item" onclick="loadFromHistory(' + i + ')">';
    html += '  <div class="history-top">';
    html += '    <span class="history-question">' + escapeHtml(item.question.slice(0, 90)) + (item.question.length > 90 ? '…' : '') + '</span>';
    html += '    <span class="history-score" style="color:' + color + '">' + score + '/100</span>';
    html += '  </div>';
    html += '  <div class="history-meta">' + escapeHtml(item.error_type) + ' · C:' + item.correctness_score + ' R:' + item.reasoning_score + ' Cl:' + item.clarity_score + ' · ' + item.time + '</div>';
    html += '</div>';
  }

  historyList.innerHTML = html;
}

function loadFromHistory(index) {
  const item = history[index];
  inputQuestion.value = item.question;
  inputAnswer.value   = item.answer;
  inputResponse.value = item.response;
  tabSingle.click();
  displayResults(item);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Export result as JSON ──
document.getElementById('export-btn').addEventListener('click', function () {

  if (sessionHistory.length === 0) return;

  const latest = sessionHistory[0];

  const exportData = {
    question:          latest.question,
    correct_answer:    latest.answer,
    ai_response:       latest.response,
    structure_check:   latest.structure_check,
    correctness_score: latest.correctness_score,
    reasoning_score:   latest.reasoning_score,
    clarity_score:     latest.clarity_score,
    error_type:        latest.error_type,
    final_score:       latest.final_score,
    explanation:       latest.explanation,
    evaluated_at:      new Date().toISOString()
  };

  const blob = new Blob(
    [JSON.stringify(exportData, null, 2)],
    { type: 'application/json' }
  );

  const url      = URL.createObjectURL(blob);
  const link     = document.createElement('a');
  link.href      = url;
  link.download  = 'evaluation-' + Date.now() + '.json';
  link.click();
  URL.revokeObjectURL(url);

});
