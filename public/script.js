// ============================================================
//  script.js – EduPortal Frontend JavaScript
//  Handles: Login forms, API calls, UI state management
// ============================================================

// Backend API base URL
const API_BASE = 'http://localhost:3000';

// -------------------------------------------------------
// UI STATE MANAGEMENT
// Show/hide sections based on user interaction
// -------------------------------------------------------

/**
 * Shows the student or teacher login form.
 * Hides the portal selection cards.
 * @param {string} type - 'student' or 'teacher'
 */
function showLogin(type) {
  // Hide portal selection
  document.getElementById('portal-selection').style.display = 'none';

  // Show the correct login section with animation
  const section = document.getElementById(type + '-login-section');
  section.style.display = 'flex';
  section.style.animation = 'none';
  // Force reflow to restart animation
  void section.offsetWidth;
  section.style.animation = 'fadeInUp 0.5s ease both';

  // Focus the first input field for better UX
  setTimeout(() => {
    const firstInput = section.querySelector('input');
    if (firstInput) firstInput.focus();
  }, 100);
}

/**
 * Returns to the portal selection screen.
 * Resets forms and messages.
 */
function showPortalSelection() {
  // Show portal selection
  document.getElementById('portal-selection').style.display = 'flex';

  // Hide all login sections
  document.getElementById('student-login-section').style.display = 'none';
  document.getElementById('teacher-login-section').style.display = 'none';

  // Reset forms and messages
  resetForm('student-login-form', 'student-message');
  resetForm('teacher-login-form', 'teacher-message');
}

/**
 * Shows the home section after successful login.
 * @param {string} type - 'student' or 'teacher'
 */
function showHome(type) {
  // Hide all sections
  document.getElementById('portal-selection').style.display = 'none';
  document.getElementById('student-login-section').style.display = 'none';
  document.getElementById('teacher-login-section').style.display = 'none';

  // Show home section with animation
  const homeSection = document.getElementById(type + '-home');
  homeSection.style.display = 'block';
  homeSection.style.animation = 'none';
  void homeSection.offsetWidth;
  homeSection.style.animation = 'fadeInUp 0.6s ease both';
}

/**
 * Logs out the current user and returns to portal selection.
 */
function logout() {
  // Hide home sections
  document.getElementById('student-home').style.display = 'none';
  document.getElementById('teacher-home').style.display = 'none';

  // Show portal selection
  showPortalSelection();
  document.getElementById('portal-selection').style.display = 'flex';

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// -------------------------------------------------------
// HELPER FUNCTIONS
// -------------------------------------------------------

/**
 * Resets a form and clears its message display.
 * @param {string} formId - The ID of the form element
 * @param {string} messageId - The ID of the message element
 */
function resetForm(formId, messageId) {
  const form = document.getElementById(formId);
  const msg = document.getElementById(messageId);
  if (form) form.reset();
  if (msg) {
    msg.textContent = '';
    msg.className = 'form-message';
  }
}

/**
 * Shows a message in the form (success or error).
 * @param {string} elementId - The ID of the message element
 * @param {string} text - Message text to display
 * @param {string} type - 'success' or 'error'
 */
function showMessage(elementId, text, type) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = text;
    el.className = 'form-message ' + type;
  }
}

/**
 * Sets the loading state for a submit button.
 * @param {string} btnId - The ID of the submit button
 * @param {boolean} isLoading - Whether to show loading state
 * @param {string} label - The text label for the button
 */
function setButtonLoading(btnId, isLoading, label = 'Login') {
  const btn = document.getElementById(btnId);
  const btnText = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.btn-spinner');

  if (isLoading) {
    btn.disabled = true;
    if (btnText) btnText.style.display = 'none';
    if (spinner) spinner.style.display = 'inline';
  } else {
    btn.disabled = false;
    if (btnText) {
      btnText.style.display = 'inline';
      btnText.textContent = label;
    }
    if (spinner) spinner.style.display = 'none';
  }
}

/**
 * Toggles the password field visibility.
 */
function togglePassword() {
  const passwordInput = document.getElementById('teacher-password');
  const toggleBtn = document.getElementById('toggle-pwd-btn');

  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    toggleBtn.textContent = '🙈';
    toggleBtn.title = 'Hide password';
  } else {
    passwordInput.type = 'password';
    toggleBtn.textContent = '👁️';
    toggleBtn.title = 'Show password';
  }
}

/**
 * Formats a date string to a human-readable format.
 * @param {string} dateString - ISO date string from MySQL
 * @returns {string} Formatted date string
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  return date.toLocaleString('en-US', options);
}

// -------------------------------------------------------
// STUDENT LOGIN HANDLER
// -------------------------------------------------------

/**
 * Handles student login form submission.
 * Sends POST request to /student-login API.
 * @param {Event} event - Form submit event
 */
async function handleStudentLogin(event) {
  event.preventDefault(); // Prevent default form submission (page reload)

  // Get form values
  const name = document.getElementById('student-name').value.trim();
  const regNo = document.getElementById('student-reg').value.trim();

  // Clear previous messages
  showMessage('student-message', '', '');

  // Basic client-side validation
  if (!name || !regNo) {
    showMessage('student-message', '⚠️ Please fill in all fields.', 'error');
    return;
  }

  // Show loading state
  setButtonLoading('student-submit-btn', true);

  try {
    // Send login request to backend
    const response = await fetch(API_BASE + '/student-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        student_name: name,
        reg_no: regNo
      })
    });

    // Parse response JSON
    const data = await response.json();

    if (data.success) {
      // Login successful!
      showMessage('student-message', '✅ ' + data.message, 'success');

      // Update the welcome name on the student home page
      document.getElementById('student-welcome-name').textContent = data.student.name;
      document.getElementById('student-welcome-reg').textContent = data.student.reg_no;

      // Wait 1 second then redirect to home
      setTimeout(() => {
        showHome('student');
      }, 1000);
    } else {
      // Login failed
      showMessage('student-message', '❌ ' + data.message, 'error');
    }

  } catch (error) {
    // Network error (server not running, etc.)
    console.error('Student login error:', error);
    showMessage(
      'student-message',
      '🔌 Cannot connect to server. Make sure the backend (server.js) is running on port 3000.',
      'error'
    );
  } finally {
    // Always restore button state
    setButtonLoading('student-submit-btn', false, 'Login to Student Portal');
  }
}

// -------------------------------------------------------
// TEACHER LOGIN HANDLER
// -------------------------------------------------------

/**
 * Handles teacher login form submission.
 * Sends POST request to /teacher-login API.
 * @param {Event} event - Form submit event
 */
async function handleTeacherLogin(event) {
  event.preventDefault(); // Prevent default form submission

  // Get form values
  const username = document.getElementById('teacher-username').value.trim();
  const password = document.getElementById('teacher-password').value;

  // Clear previous messages
  showMessage('teacher-message', '', '');

  // Basic client-side validation
  if (!username || !password) {
    showMessage('teacher-message', '⚠️ Please fill in all fields.', 'error');
    return;
  }

  // Show loading state
  setButtonLoading('teacher-submit-btn', true);

  try {
    // Send login request to backend
    const response = await fetch(API_BASE + '/teacher-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: username,
        password: password
        // NOTE: Password is sent to backend but NEVER stored in plaintext in history
        // In production, use HTTPS and hashed passwords!
      })
    });

    // Parse response JSON
    const data = await response.json();

    if (data.success) {
      // Login successful!
      showMessage('teacher-message', '✅ ' + data.message, 'success');

      // Update the welcome name on the teacher home page
      document.getElementById('teacher-welcome-name').textContent = data.teacher.username;

      // Wait 1 second then show teacher home
      setTimeout(() => {
        showHome('teacher');
      }, 1000);
    } else {
      // Login failed
      showMessage('teacher-message', '❌ ' + data.message, 'error');
    }

  } catch (error) {
    // Network error
    console.error('Teacher login error:', error);
    showMessage(
      'teacher-message',
      '🔌 Cannot connect to server. Make sure the backend (server.js) is running on port 3000.',
      'error'
    );
  } finally {
    // Restore button
    setButtonLoading('teacher-submit-btn', false, 'Login to Teacher Portal');
  }
}

// -------------------------------------------------------
// KEYBOARD ACCESSIBILITY
// Allow pressing Enter/Space on portal cards to open login
// -------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Portal cards keyboard support
  const cards = document.querySelectorAll('.portal-card');
  cards.forEach(card => {
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });

  // Add subtle entrance animation to hero section
  const hero = document.querySelector('.hero');
  if (hero) {
    hero.style.opacity = '0';
    hero.style.transform = 'translateY(20px)';
    requestAnimationFrame(() => {
      hero.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
      hero.style.opacity = '1';
      hero.style.transform = 'translateY(0)';
    });
  }
});
