
// This is a global declaration to make the firebase object available on the window
declare global {
  interface Window {
    firebase: any;
  }
}

// IMPORTANT: Replace this with your own Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC8ZNov-B-zwPv7_uW9YGvibOkyPOR4x6M",
  authDomain: "mindmap-weaver-9e703.firebaseapp.com",
  projectId: "mindmap-weaver-9e703",
  storageBucket: "mindmap-weaver-9e703.firebasestorage.app",
  messagingSenderId: "272566716735",
  appId: "1:272566716735:web:fbc32ba73de9a490da6b8a"
};

// Initialize Firebase
if (!window.firebase.apps.length) {
  window.firebase.initializeApp(firebaseConfig);
}

const auth = window.firebase.auth();
const db = window.firebase.firestore();

export { auth, db };
