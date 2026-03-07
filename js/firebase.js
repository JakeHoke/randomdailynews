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
    apiKey:            'YOUR_API_KEY',
    authDomain:        'YOUR_AUTH_DOMAIN',
    projectId:         'YOUR_PROJECT_ID',
    storageBucket:     'YOUR_STORAGE_BUCKET',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
    appId:             'YOUR_APP_ID',
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
