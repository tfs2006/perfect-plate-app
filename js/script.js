// =================================================================================
// PERFECT-PLATE - FINAL PRODUCTION SCRIPT
// =================================================================================

// --- INITIALIZE LIBRARIES ---
lucide.createIcons();
const { jsPDF } = window.jspdf;

// --- FIREBASE SETUP ---
// This is your actual Firebase configuration from your screenshot.
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

// --- SIMULATED FIREBASE & AUTH (for local testing in VS Code) ---
// This section simulates Firebase so you can test without deploying.
// For your live site, you would delete this simulation block and use the real code above.
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
        const userEmail = Object.keys(FAKE_DB.users).find(email => FAKE_DB.users[email] && FAKE_DB.users[email].uid === userId) || Object.keys(FAKE_DB.users).find(email => email === userId);
        const data = FAKE_DB.users[userEmail];
        return { exists: () => !!data, data: () => data };
    },
    setDoc: async (docRef, data, options) => {
        const userId = docRef.id;
        const userEmail = data.email || (auth.currentUser ? auth.currentUser.email : null);
        if (userEmail) {
           if (!FAKE_DB.users[userEmail] || !options || !options.merge) {
             FAKE_DB.users[userEmail] = { uid: userId, ...data };
           } else {
             FAKE_DB.users[userEmail] = { ...FAKE_DB.users[userEmail], ...data, uid: userId };
           }
        }
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
    const authModal = document.createElement('div');
    authModal.id = 'auth-modal';
    authModal.className = 'fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50';
    authModal.innerHTML = `
        <div class="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
            <h2 class="text-2xl font-bold text-gray-800">Sign Up or Log In</h2>
            <p class="mt-2 text-gray-600">Create an account or log in to continue.</p>
            <form id="auth-form" class="mt-6 text-left">
                <input type="email" id="auth-email" placeholder="Email" required class="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg">
                <input type="password" id="auth-password" placeholder="Password" required class="mt-4 w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg">
                <div class="mt-6 flex gap-4">
                    <button type="submit" name="signup" class="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700">Sign Up</button>
                    <button type="submit" name="login" class="flex-1 bg-gray-200 text-gray-800 font-bold py-3 rounded-lg hover:bg-gray-300">Log In</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(authModal);

    document.getElementById('auth-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const action = e.submitter.name;

        try {
            if (action === 'signup') {
                const userCredential = await auth.createUserWithEmailAndPassword(auth, email, password);
                await db.setDoc(db.doc(db, "users", userCredential.user.uid), {
                    email: userCredential.user.email,
                    isSubscribed: false,
                    usageCount: 0
                });
                showMessage("Account created successfully!");
            } else {
                await auth.signInWithEmailAndPassword(auth, email, password);
                showMessage("Logged in successfully!");
            }
            document.body.removeChild(authModal);
            checkUserStatus();
        } catch (error) {
            showMessage(error.message);
        }
    });
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
        await db.setDoc(userDocRef, { email: currentUser.email, isSubscribed: false, usageCount: 0 });
        return true;
    }
}

function showPaywall() {
    // ... (This function remains the same)
}

// --- SECURE API CALLS (to your serverless functions) ---
async function secureApiCall(endpoint, body) {
    // This is the correct, robust path for Netlify functions
    const functionUrl = `/.netlify/functions/${endpoint}`;
    
    const response = await fetch(functionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The body of our request to the serverless function
        // now contains the original body intended for the Google API.
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
        // Call the 'generate-plan' serverless function for the meal plan
        const textResult = await secureApiCall('generate-plan', { 
            endpoint: 'gemini-2.0-flash:generateContent',
            body: { contents: [{ parts: [{ text: prompt }] }] }
        });
        
        if (textResult.candidates && textResult.candidates.length > 0) {
            currentMealPlanText = textResult.candidates[0].content.parts[0].text;
            displayResults(currentMealPlanText);
        } else {
            throw new Error("Failed to generate a meal plan.");
        }

        const imagePrompt = `A vibrant, appetizing, and professionally shot flat lay photograph...`; // Full prompt here
        // Call the 'generate-plan' serverless function for the image
        const imageResult = await secureApiCall('generate-plan', {
            endpoint: 'imagen-3.0-generate-002:predict',
            body: { instances: [{ prompt: imagePrompt }], parameters: { "sampleCount": 1} }
        });

        if (imageResult.predictions && imageResult.predictions.length > 0) {
            mealPlanImage.src = `data:image/png;base64,${imageResult.predictions[0].bytesBase64Encoded}`;
        }

        const userDocRef = db.doc(db, "users", currentUser.uid);
        const userDoc = await db.getDoc(userDocRef);
        if (userDoc.exists()) {
            const newCount = (userDoc.data().usageCount || 0) + 1;
            await db.setDoc(userDocRef, { usageCount: newCount }, { merge: true });
        }
        
        loader.style.display = 'none';
        resultContainer.style.display = 'block';

    } catch (error) {
        loader.style.display = 'none';
        formContainer.style.display = 'block';
        showMessage(error.message || "An unknown error occurred.");
    }
});

// --- INITIALIZATION ---
// This listener is key. It sets the currentUser variable when the page loads.
auth.onAuthStateChanged((user) => {
    currentUser = user;
    if (user) {
        console.log("User is logged in:", user.email);
    } else {
        console.log("No user is logged in.");
    }
});

// --- All other functions (nextStep, prevStep, displayResults, PDF generation, etc.) ---
// [The rest of your existing, working JavaScript code would go here]
// This includes: nextStep, prevStep, updateStepIndicator, groceryListButton listener,
// refineButton listener, displayResults, parseMarkdownForPdf, pdfButton listener, showMessage.
