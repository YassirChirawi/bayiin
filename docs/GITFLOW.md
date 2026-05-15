# Stratégie de Branches (GitFlow + Linear)

## 1. Flux de Travail

```text
Linear (Backlog)          Git                        GitHub                  Linear (Auto)
─────────────────    ──────────────────    ──────────────────────    ──────────────────
1. Pick ticket       2. Créer branche      4. Ouvrir PR → develop   5. Ticket → Done
   → In Progress        feature/BAY-XX-*   5. Merge après CI ✅        (auto-sync)
                     3. Commits liés
                        feat(scope): ... BAY-XX
```

> **Règle d'or** : Le ticket Linear existe TOUJOURS avant le code. C'est la source de vérité du backlog.

## 2. Branches principales

| Branche | Rôle | Règle |
|---|---|---|
| **master** | Production | JAMAIS de push direct. PR obligatoire depuis develop. |
| **develop** | Intégration | PR obligatoire. La CI doit passer à 100% avant le merge. |

## 3. Branches secondaires

| Type | Créée depuis | Mergée vers | Description |
|---|---|---|---|
| **feature/*** | develop | develop | Une branche par ticket Linear. |
| **hotfix/*** | master | master + develop | Correctif critique en production. |
| **release/*** | develop | master + develop | Préparation d'une version majeure. |

## 4. Convention de Nommage

### Branches
Format : `[type]/[LINEAR-ID]-[description-en-kebab-case]`

```bash
# Feature classique
feature/BAY-42-finances-module

# Hotfix critique
hotfix/BAY-99-ios-notification-crash

# Release
release/v1.1.0
```

### Commits (Conventional Commits + Linear ID)
Format : `type(scope): description - LINEAR-ID`

```bash
feat(finances): add revenue dashboard - BAY-42
fix(orders): correct status transition bug - BAY-15
docs: update API documentation - BAY-78
refactor(crm): extract customer utils - BAY-53
```

### Pull Requests
Format du titre : `[BAY-XX] Description claire`

```
[BAY-42] Module Finances — KPIs et facturation
[BAY-15] Fix cycle de vie des commandes
```

## 5. Intégration Linear ↔ GitHub

L'intégration native synchronise automatiquement :
- **Branche créée** → Ticket passe en "In Progress"
- **PR ouverte** → Ticket lié avec aperçu des commits
- **PR mergée** → Ticket passe en "Done"

Configuration : **Linear → Settings → Integrations → GitHub**

## 6. Workflow Quotidien

```bash
# 1. Récupérer develop à jour
git checkout develop && git pull origin develop

# 2. Créer la branche depuis le ticket Linear (ex: BAY-42)
git checkout -b feature/BAY-42-finances-module

# 3. Développer et commiter
git add .
git commit -m "feat(finances): add revenue KPIs - BAY-42"

# 4. Pousser et ouvrir la PR
git push -u origin feature/BAY-42-finances-module
# → Ouvrir PR vers develop sur GitHub

# 5. Après merge, nettoyer
git checkout develop && git pull
git branch -d feature/BAY-42-finances-module
```
