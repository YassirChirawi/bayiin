# 📱 Android — Runbook de publication (Google Play)

Guide pas-à-pas pour générer, signer et publier l'app **BayIIn** (`com.bayiin.app`) sur le Play Store.
Cible : produire un **AAB** (Android App Bundle) signé, prêt à uploader.

> Ordre des étapes important. Coche au fur et à mesure.

---

## 0. Prérequis (une seule fois)

- [ ] **Node** installé (le repo tourne déjà dessus).
- [ ] **Android Studio** (inclut le SDK Android + un JDK 17). → https://developer.android.com/studio
- [ ] **Compte Google Play Console** (25 $ une fois). → https://play.google.com/console
- [ ] Java : `java -version` doit renvoyer **17+** (celui d'Android Studio suffit). Si besoin, pointe `JAVA_HOME` vers le JBR d'Android Studio.

Vérifie que Capacitor voit les plateformes :

```bash
npx cap ls           # doit lister android (et ios)
```

---

## 1. Firebase natif (sinon auth Google + push cassés)

L'app utilise Firebase. En natif, il faut enregistrer le package.

1. [ ] Console Firebase → projet **commerce-saas-62f32** → *Paramètres du projet* → **Ajouter une application → Android**.
2. [ ] Nom du package : **`com.bayiin.app`** (exactement — c'est l'`applicationId`).
3. [ ] Télécharge **`google-services.json`** → place-le dans **`android/app/google-services.json`**.
4. [ ] (SHA-1) Pour Google Sign-In natif, ajoute l'empreinte SHA-1 de ta clé (voir §4) dans la config de l'app Firebase.

> Ce fichier n'est **pas** committé (déjà couvert par la logique de secrets). Chaque dev le récupère.

---

## 2. Icône & splash BayIIn (remplacer les placeholders)

Le plus simple : l'outil officiel `@capacitor/assets`.

```bash
npm i -D @capacitor/assets
# Prépare les sources (fond transparent pour l'icône) :
#   resources/icon.png      1024x1024
#   resources/splash.png    2732x2732 (logo centré)
npx @capacitor/assets generate --android
```

Cela régénère toutes les densités d'icônes + splash dans `android/`.
- [ ] Icône 1024² prête · [ ] Splash 2732² prête · [ ] `generate` exécuté sans erreur.

---

## 3. Numéro de version (à chaque publication)

Fichier **`android/app/build.gradle`** :

```gradle
versionCode 1        // ENTIER, +1 à CHAQUE upload Play (obligatoire, jamais réutilisé)
versionName "1.0"    // Version visible par l'utilisateur (ex: "1.0.0")
```

- [ ] `versionCode` incrémenté par rapport au dernier upload.
- [ ] `versionName` mis à jour (facultatif mais recommandé).

---

## 4. Créer la clé de signature (une seule fois — À CONSERVER À VIE)

⚠️ **Si tu perds ce keystore, tu ne pourras plus jamais mettre à jour l'app.** Sauvegarde-le (gestionnaire de mots de passe + backup chiffré).

```bash
keytool -genkey -v -keystore bayiin-release.keystore \
  -alias bayiin -keyalg RSA -keysize 2048 -validity 10000
```

Réponds aux questions (nom, organisation…) et **note le mot de passe**.
Place `bayiin-release.keystore` hors du repo (ex: `~/keys/`), **jamais committé**.

Récupérer le **SHA-1** (pour Firebase §1.4) :

```bash
keytool -list -v -keystore bayiin-release.keystore -alias bayiin
```

- [ ] Keystore créé · [ ] Sauvegardé en lieu sûr · [ ] SHA-1 ajouté à Firebase.

---

## 5. Brancher la signature dans Gradle

Crée **`android/keystore.properties`** (⚠️ **NE PAS committer** — ajoute-le à `.gitignore`) :

```properties
storeFile=/chemin/absolu/vers/bayiin-release.keystore
storePassword=TON_MDP
keyAlias=bayiin
keyPassword=TON_MDP
```

Dans **`android/app/build.gradle`**, ajoute en haut du bloc `android { … }` :

```gradle
// Charge la config de signature depuis keystore.properties (non versionné)
def keystoreProps = new Properties()
def keystoreFile = rootProject.file("keystore.properties")
if (keystoreFile.exists()) { keystoreProps.load(new FileInputStream(keystoreFile)) }

android {
    // …existant…
    signingConfigs {
        release {
            if (keystoreFile.exists()) {
                storeFile file(keystoreProps['storeFile'])
                storePassword keystoreProps['storePassword']
                keyAlias keystoreProps['keyAlias']
                keyPassword keystoreProps['keyPassword']
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

- [ ] `keystore.properties` créé + dans `.gitignore`.
- [ ] `signingConfigs.release` + `buildTypes.release` en place.

---

## 6. Construire le web + synchroniser Capacitor

```bash
npm install          # au cas où
npm run cap:sync     # = vite build + cap sync (copie dist/ dans android/)
```

- [ ] `cap:sync` terminé sans erreur (le web à jour est copié dans le projet natif).

> Refais **toujours** `cap:sync` après chaque changement de code web.

---

## 7. Générer l'AAB signé (le fichier à uploader)

```bash
cd android
./gradlew bundleRelease          # Windows : gradlew.bat bundleRelease
```

Sortie : **`android/app/build/outputs/bundle/release/app-release.aab`**

Pour un **APK** de test direct sur device (hors Play) :

```bash
./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

- [ ] `.aab` généré.

---

## 8. Tester avant d'uploader

```bash
# Installer l'APK release sur un téléphone branché (USB debugging activé) :
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

Checklist device réel :
- [ ] Connexion (email/mdp **et** Google si Firebase natif configuré).
- [ ] Barre d'état / notch OK (safe-areas), BottomNav pas sous la barre gestuelle.
- [ ] Bouton **retour Android** navigue correctement, quitte à la racine.
- [ ] Clavier ne masque pas les champs.
- [ ] Création commande / produit / scan — parcours COD complet.

---

## 9. Publier sur Google Play

1. [ ] Play Console → **Créer une application** (nom, langue, gratuit).
2. [ ] Renseigner : fiche store (description, **captures d'écran** téléphone, icône 512², bannière), **politique de confidentialité** (URL), catégorie, coordonnées.
3. [ ] *Content rating*, *Data safety* (déclarer les données collectées : email, téléphone…), *App access* (fournir un **compte de test** si login requis).
4. [ ] **Release → Testing → Internal testing** → créer une release → **uploader l'`.aab`**.
5. [ ] Ajouter des testeurs (emails) → obtenir le lien d'installation → valider en conditions réelles.
6. [ ] Quand tout est bon : promouvoir vers **Production** → examen Google (quelques heures à quelques jours).

---

## 🔁 Mises à jour suivantes (rapide)

```
1. Incrémente versionCode (+ versionName)   → android/app/build.gradle §3
2. npm run cap:sync                          → §6
3. cd android && ./gradlew bundleRelease     → §7
4. Upload le nouvel .aab dans une release Play → §9.4
```

---

## Notes spécifiques BayIIn

- `applicationId` = **`com.bayiin.app`** (aligné config Capacitor + iOS). Ne plus changer après publication.
- Réglages natifs (StatusBar, splash, clavier, retour Android) : [src/lib/native.js](../src/lib/native.js), appelé au démarrage — no-op sur le web.
- Google Sign-In natif fiable = installer **`@capacitor-firebase/authentication`** (le `signInWithRedirect` actuel est un pis-aller WebView). Sinon email/mot de passe fonctionne partout.
- **Push notifications** natives : ajouter `@capacitor/push-notifications` + config FCM (le hook `usePushNotifications` existe déjà côté web).

*iOS : même logique mais nécessite un Mac + Xcode + Apple Developer — voir un futur `IOS_RELEASE.md`.*
