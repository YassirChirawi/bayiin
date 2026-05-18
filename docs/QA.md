# 🛡️ BayIIn — Guide Qualité & Releases

> Ce document formalise les workflows de release, le pipeline CI, et la procédure de hotfix pour l'ensemble de l'équipe BayIIn.

---

## 📊 Pipeline CI/CD — Vue d'ensemble

```
Push code
    │
    ▼
feature/* / chore/* / fix/* → CI Feature
    ├── ESLint
    ├── Unit Tests
    └── Build check

develop → CI Develop
    ├── ESLint + rapport JSON
    ├── Unit Tests + Coverage (seuil 60%)
    ├── Tests E2E Playwright
    ├── Snyk (High+)
    ├── SonarCloud Quality Gate
    ├── Bundle size check
    └── Deploy staging (prévu)

master/main → CI Master
    ├── Suite non-régression complète
    ├── Snyk (Medium+) — plus strict
    ├── SonarCloud Quality Gate bloquant
    ├── Build production
    ├── E2E complète
    └── Deploy prod Firebase + notification
```

---

## 🏃 Méthode Agile — Shape Up + Scrum Lite

### Cadence

```
Cycle de 2 semaines (Sprint)
├── Semaine 1 : Build
│   ├── Lundi    : Sprint Planning (30 min)
│   ├── Mar-Jeu  : Développement
│   └── Vendredi : Review + Demo
└── Semaine 2 : Build + Polish
    ├── Lundi    : Continuation
    ├── Mar-Jeu  : Tests + QA
    └── Vendredi : Release + Rétro (15 min)
```

### Linear — Statuts des tickets

```
Backlog (toutes les idées)
    ↓
Sprint actuel (2 semaines)
    ↓
In Progress (max 3 tickets en même temps — WIP limit)
    ↓
In Review (PR ouverte)
    ↓
Done
```

### Labels Linear

| Label | Usage |
|---|---|
| 🔴 `hotfix` | Bug critique en production |
| 🟠 `bug` | Bug non critique |
| 🟡 `feature` | Nouvelle fonctionnalité |
| 🔵 `chore` | Tech debt, refactor |
| 🟣 `security` | Vulnérabilité |
| 📚 `docs` | Documentation |

### Sizing (Story Points)

| Taille | Points | Durée estimée |
|---|---|---|
| XS | 1 | < 2h |
| S | 2 | demi-journée |
| M | 3 | 1 journée |
| L | 5 | 2-3 jours |
| XL | 8 | 1 semaine (à découper) |

---

## 🔗 Convention Git ↔ Linear

### Format de commit obligatoire

```bash
feat(orders): ajout score risque commande [BAY-42]
fix(pwa): correction crash iOS notifications [BAY-67]
chore(ci): ajout SonarCloud pipeline [BAY-35]
```

Linear détecte automatiquement le `BAY-XX` et lie le commit au ticket.

### Branches

```bash
feature/BAY-42-risk-scoring        # Nouvelles fonctionnalités
fix/BAY-67-ios-notification        # Corrections de bug
hotfix/BAY-90-critical-crash       # Bug critique prod (depuis master)
chore/BAY-35-agile-ci              # Tech debt / infrastructure
release/v1.1.0                     # Branche de release
```

---

## 🚀 Scénario A — Release Feature

```
DÉCLENCHEUR : Fin de sprint, develop stable
DURÉE ESTIMÉE : 45 minutes
```

### Étapes

1. **Vérification pre-release** (5 min)
   ```bash
   git checkout develop
   git pull origin develop
   git status
   # Vérifier CI develop vert → GitHub Actions
   ```

2. **Créer la branche release** (2 min)
   ```bash
   git checkout -b release/v1.1.0
   git push origin release/v1.1.0
   ```

3. **Bump version** (3 min)
   ```bash
   npm version minor  # 1.0.0 → 1.1.0
   git add package.json
   git commit -m "chore(release): bump version to v1.1.0"
   ```

4. **CI release** (automatique ~10 min)
   - Tests unitaires ✅
   - Tests E2E Playwright ✅
   - Snyk security scan ✅
   - SonarCloud quality ✅
   - Build production ✅

5. **PR release → master** (5 min)
   ```
   Title: release: v1.1.0
   Body: liste des features du sprint
   ```

6. **Merge et tag** (5 min)
   ```bash
   git checkout master
   git merge release/v1.1.0 --no-ff
   git tag -a v1.1.0 -m "Release v1.1.0 — [description]"
   git push origin master --tags
   ```

7. **Deploy production** — automatique via `ci-master.yml`

8. **Post-deploy** (15 min)
   ```bash
   # Vérifier bayiin.shop manuellement
   # Tester sur mobile iOS → 0 erreur
   # Créer commande test → supprimer
   # Vérifier Firebase Console → 0 erreur

   git checkout develop
   git merge release/v1.1.0
   git push origin develop

   git branch -d release/v1.1.0
   git push origin --delete release/v1.1.0
   ```

9. **Linear + Notion** — passer tickets Done, documenter la release.

---

## 🚨 Scénario B — Hotfix

```
DÉCLENCHEUR : Bug critique sur master/prod
URGENCE : Traiter dans les 2h maximum
DURÉE ESTIMÉE : 20-30 minutes
```

### Étapes

1. **Ticket Linear** — Label `🔴 hotfix`, Priorité Urgent

2. **Branche depuis master** (JAMAIS develop)
   ```bash
   git checkout master
   git pull origin master
   git checkout -b hotfix/description-courte
   ```

3. **Fix + commit**
   ```bash
   git commit -m "fix(module): description [BAY-XX]

   Description détaillée du fix.
   Fixes BAY-XX"
   ```

4. **Tests locaux** (5 min)
   ```bash
   npm run test -- --run
   npm run build
   ```

5. **Push → CI auto** (5 min)

6. **Merge master ET develop**
   ```bash
   git checkout master
   git merge hotfix/description --no-ff
   git tag -a v1.0.1 -m "Hotfix: description"
   git push origin master --tags

   git checkout develop
   git merge hotfix/description --no-ff
   git push origin develop

   git branch -d hotfix/description
   git push origin --delete hotfix/description
   ```

7. **Vérification post-deploy** — reproduire le bug, vérifier Firebase.

8. **Documenter l'incident** dans Notion (cause, fix, prévention).

---

## 🔐 Secrets GitHub à configurer

| Secret | Description | Source |
|---|---|---|
| `SONAR_TOKEN` | Token d'authentification SonarCloud | [sonarcloud.io](https://sonarcloud.io) |
| `SNYK_TOKEN` | Token Snyk pour scan vulnérabilités | [snyk.io](https://snyk.io) |
| `CODECOV_TOKEN` | Token Codecov pour rapports de couverture | [codecov.io](https://codecov.io) |
| `FIREBASE_SERVICE_ACCOUNT` | Service account JSON (base64) | Firebase Console → Settings |

---

## ✅ Checklists

### Checklist Release Feature

**Pre-release :**
- [ ] CI develop vert depuis 24h
- [ ] Zéro bug Critique ouvert dans Linear
- [ ] SonarCloud Quality Gate passé
- [ ] Snyk 0 vulnérabilité High
- [ ] Tests E2E passent sur staging
- [ ] Testé manuellement sur iOS Safari

**Release :**
- [ ] Branche `release/vX.X.X` créée
- [ ] Version bump committée
- [ ] PR develop → master créée
- [ ] CI master vert
- [ ] Tag `vX.X.X` créé

**Post-release :**
- [ ] bayiin.shop vérifié manuellement
- [ ] 0 erreur Firebase Console
- [ ] Commande de test créée et supprimée
- [ ] Branche release supprimée
- [ ] develop mis à jour avec master
- [ ] Tickets Linear → Done
- [ ] Notion Releases mis à jour

### Checklist Hotfix

- [ ] Ticket Linear créé (Urgent)
- [ ] Branche `hotfix/*` depuis master
- [ ] Fix + test local
- [ ] CI feature vert
- [ ] Merge master + tag
- [ ] Merge develop
- [ ] Vérification post-deploy
- [ ] Incident documenté dans Notion
