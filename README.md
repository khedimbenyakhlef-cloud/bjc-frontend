# Beny-Joe Cloud — Frontend

## 📁 Structure
```
bjc-frontend/
├── index.html        ← Page de connexion / inscription
├── dashboard.html    ← Dashboard principal
├── callback.html     ← Callback OAuth Google
├── css/
│   └── style.css     ← Styles complets
└── js/
    ├── api.js        ← Module API (fetch, token, routes)
    ├── auth.js       ← Login / Register
    └── dashboard.js  ← Dashboard complet
```

## 🚀 Déploiement sur GitHub Pages (GRATUIT)

1. Crée un repo GitHub `bjc-frontend`
2. Upload tous les fichiers
3. Va dans Settings → Pages → Source: main branch
4. Ton frontend sera disponible sur :
   `https://[ton-username].github.io/bjc-frontend/`

## 🔗 Configuration

Le frontend pointe vers :
`https://bjc-v4.onrender.com`

Pour changer l'URL API, modifie la ligne dans `js/api.js` :
```js
const API_BASE = 'https://bjc-v4.onrender.com';
```

## ✅ Fonctionnalités

- Connexion email/mot de passe
- Connexion Google OAuth
- Inscription
- Dashboard avec liste des apps
- Créer une application
- Déployer (upload ZIP)
- Variables d'environnement
- Fonctions serverless
- Suppression d'app
- Statistiques
- Profil utilisateur
- Toasts de notification
- Responsive mobile
- Thème sombre

## ⚠️ Important : Configurer le Callback OAuth

Sur Google Cloud Console, ajoute l'URL de callback :
`https://[ton-username].github.io/bjc-frontend/callback.html`

Et sur Render, mets à jour :
`GOOGLE_CALLBACK_URL = https://bjc-v4.onrender.com/api/auth/google/callback`

Le backend doit rediriger vers :
`https://[ton-username].github.io/bjc-frontend/callback.html?token=JWT_TOKEN`
