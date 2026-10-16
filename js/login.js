import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

onAuthStateChanged(auth, user => {
  if (user) window.location.href = 'dashboard.html';
});

window.handleLogin = async function() {
  const email    = document.getElementById('inp-email').value.trim();
  const password = document.getElementById('inp-password').value;
  const btn      = document.getElementById('btn-login');
  const errBox   = document.getElementById('error-msg');
  const errText  = document.getElementById('err-text');

  if (!email || !password) {
    errText.textContent = 'Please enter your email and password.';
    errBox.classList.add('show'); return;
  }
  btn.classList.add('loading'); btn.disabled = true;
  errBox.classList.remove('show');

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = 'dashboard.html';
  } catch (err) {
    const msgs = {
      'auth/user-not-found':     'No account found with this email.',
      'auth/wrong-password':     'Incorrect password.',
      'auth/invalid-email':      'Invalid email address.',
      'auth/too-many-requests':  'Too many attempts. Try again later.',
      'auth/invalid-credential': 'Invalid email or password.',
    };
    errText.textContent = msgs[err.code] || err.message;
    errBox.classList.add('show');
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
};

document.getElementById('inp-password')
  .addEventListener('keydown', e => { if (e.key === 'Enter') window.handleLogin(); });