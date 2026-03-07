/**
 * Firebase Initialization
 *
 * Initializes the Firebase app and Firestore instance.
 * Exports `db` for use by all other modules.
 *
 * Replace the firebaseConfig values with your project credentials:
 * Firebase Console → Project Settings → Your Apps → SDK setup and configuration
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js';
import { getFirestore }  from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

/* --------------------------------------------
   Firebase Project Config
   TODO: Replace with your actual project values
   -------------------------------------------- */
   const firebaseConfig = {
    apiKey: "AIzaSyA_d3KDsA4Ib-qIDsYdpOVANM2z2pn9LeM",
    authDomain: "fakenewsprank-44553.firebaseapp.com",
    projectId: "fakenewsprank-44553",
    storageBucket: "fakenewsprank-44553.firebasestorage.app",
    messagingSenderId: "197846073131",
    appId: "1:197846073131:web:9ac698001faab45a42cf6e"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
