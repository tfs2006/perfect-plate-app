// =================================================================================
// PERFECT-PLATE - FINAL PRODUCTION SCRIPT
// =================================================================================

// --- INITIALIZE LIBRARIES ---
lucide.createIcons();
const { jsPDF } = window.jspdf;

// --- FIREBASE SETUP ---
// This is your actual Firebase configuration.
const firebaseConfig = {
  apiKey: "AIzaSyCJWulSyGxtR0zYR2SuSzwdG1vitXVc",
  authDomain: "auto-blog-275601.firebaseapp.com",
  projectId: "auto-blog-275601",
  storageBucket: "auto-blog-275601.firebaseapp.com",
  messagingSenderId: "934273400730",
  appId: "1:934273400730:web:b897d9b38d2fb3d1bd9c23",
  measurementId: "G-F8Y5JMKKSF"
};

// --- NOTE FOR REAL DEPLOYMENT ---
// In your real project, you would import the Firebase modules like this
// after adding the SDK scripts to your index.html file.
/*
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
*/

// --- SIMULATED FIREBASE & AUTH (for local testing) ---
// This section simulates Firebase functionality. For your live site on Netlify,
// you would delete this simulation block and use the real Firebase code above.
const FAKE_DB = { users: {} };
const auth = {
    currentUser: null,
    onAuthStateChanged: (callback) => {
        setTimeout(() => callback(auth.currentUser), 500);
    },
    createUserWithEmailAndPassword: async (authInstance, email, password) => {
        if (FAKE_DB.users[email]) throw new Error("Email already in use.");
        const user = { uid: `fake_${Date.now()}`, email };
        FAKE_DB.users[email] = { isSubscribed: false, usageCount: 0 };
        auth.currentUser = user;
        return { user };
    },
    signInWithEmailAndPassword: async (authInstance, email, password) => {
        if (!FAKE_DB.users[email]) throw new Error("User not found.");
        const user = { uid: `fake_${Date.now()}`, email };
        auth.currentUser = user;
        return { user };
    },
    signOut: async (authInstance) => {
        auth.currentUser = null;
    }
};
const db = {
    getDoc: async (docRef) => {
        const userId = docRef.id;
        const userEmail = Object.keys(FAKE_DB.users).find(email => FAKE_DB.users[email].uid === userId || email === userId);
        const data = FAKE_DB.users[userEmail];
        return { exists: () => !!data, data: () => data };
    },
    setDoc: async (docRef, data) => {
        const userId = docRef.id;
        const userEmail = data.email;
        FAKE_DB.users[userEmail] = { ...FAKE_DB.users[userEmail], ...data, uid: userId };
    },
    doc: (dbInstance, collection, id) => ({ id })
};
// --- END OF SIMULATION ---


// --- GLOBAL STATE & DOM ELEMENTS ---
let currentStep = 1;
let currentMealPlanText = "";
let groceryListData = null;
let currentUser = null;

const formContainer = document.getElementById('form-container');
const resultContainer = document.getElementById('result-container');
const loader = document.getElementById('loader');
const messageBox = document.getElementById('message-box');
const messageText = document.getElementById('message-text');
const paywallModal = document.createElement('div');

// --- AUTHENTICATION & PAYWALL ---
function showAuthModal() {
    // ... (This function remains the same)
}

async function checkUserStatus() {
    if (!currentUser) {
        showAuthModal();
        return false;
    }

    const userDocRef = db.doc(db, "users", currentUser.uid);
    const userDoc = await db.getDoc(userDocRef);

    if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.isSubscribed || userData.usageCount < 2) {
            return true;
        } else {
            showPaywall();
            return false;
        }
    } else {
        // First time user after signup, create their doc
         await db.setDoc(db.doc(db, "users", currentUser.uid), {
            email: currentUser.email,
            isSubscribed: false,
            usageCount: 0
        });
        return true;
    }
}

function showPaywall() {
    // ... (This function remains the same)
}

// --- SECURE API CALLS (to your serverless functions) ---
async function secureApiCall(endpoint, body) {
    const functionUrl = `/.netlify/functions/${endpoint}`; // Netlify's path for functions
    const response = await fetch(functionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'An API error occurred.');
    }
    return response.json();
}

// --- MAIN APP LOGIC ---
document.getElementById('meal-plan-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const canProceed = await checkUserStatus();
    if (!canProceed) return;
    
    formContainer.style.display = 'none';
    loader.style.display = 'flex';

    const age = document.getElementById('age').value;
    const gender = document.getElementById('gender').value;
    const ethnicity = document.getElementById('ethnicity').value;
    const medicalConditions = document.getElementById('medical-conditions').value;
    const fitnessGoal = document.getElementById('fitness-goal').value;
    const exclusions = document.getElementById('exclusions').value;
    const dietaryPrefs = Array.from(document.querySelectorAll('input[name="diet"]:checked')).map(el => el.value);

    const prompt = `Create a 7-day meal plan for a ${age}-year-old ${gender} of ${ethnicity} ethnicity...`; // Full prompt here

    try {
        const textResult = await secureApiCall('generate-plan', { 
            endpoint: 'gemini-2.0-flash:generateContent',
            body: { contents: [{ parts: [{ text: prompt }] }] }
        });
        
        // ... (rest of the try block)

        // After successful generation:
        const userDocRef = db.doc(db, "users", currentUser.uid);
        const userDoc = await db.getDoc(userDocRef);
        if (userDoc.exists()) {
            const newCount = (userDoc.data().usageCount || 0) + 1;
            await db.setDoc(userDocRef, { usageCount: newCount }, { merge: true });
        }

    } catch (error) {
        // ... (error handling)
    }
});

// --- INITIALIZATION ---
// This listener is key. It sets the currentUser variable when the page loads.
auth.onAuthStateChanged((user) => {
    currentUser = user;
    if (user) {
        console.log("User is logged in:", user.email);
        // You could potentially hide a "login" button and show a "logout" button here.
    } else {
        console.log("No user is logged in.");
    }
});

// --- All other functions (nextStep, prevStep, displayResults, PDF generation, etc.) ---
// [The rest of your existing, working JavaScript code would go here]
// This includes: nextStep, prevStep, updateStepIndicator, groceryListButton listener,
// refineButton listener, displayResults, parseMarkdownForPdf, pdfButton listener, showMessage.
// For brevity, these functions are omitted as they do not need changes.
