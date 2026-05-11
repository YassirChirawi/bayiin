# Convention de Commits BayIIn

BayIIn utilise Conventional Commits ([conventionalcommits.org](https://conventionalcommits.org)). Ces règles sont obligatoires — elles alimentent le CHANGELOG automatique et le versioning semver.

## 1. Format
```text
<type>(<scope>): <description> 

[body optionnel — explication du pourquoi] 

[footer optionnel — BREAKING CHANGE ou refs issues] 
```

## 2. Types de commits
| Type | Quand l'utiliser | Impact version |
|---|---|---|
| **feat** | Nouvelle fonctionnalité visible par l'utilisateur | MINOR (1.x.0) |
| **fix** | Correction d'un bug | PATCH (1.0.x) |
| **perf** | Amélioration de performance | PATCH |
| **refactor** | Refactoring sans ajout de feature ni fix | aucun |
| **test** | Ajout ou modification de tests | aucun |
| **docs** | Documentation uniquement | aucun |
| **chore** | Tâches techniques (deps, config, build) | aucun |
| **security** | Correctif de sécurité | PATCH |
| **style** | Formatage, espacements (no logic change) | aucun |
| **ci** | Modifications pipeline CI/CD | aucun |
| **revert** | Annulation d'un commit précédent | variable |

## 3. Scopes recommandés
- `orders`, `products`, `finances`, `customers`
- `copilot`, `logistics`, `auth`, `rules`
- `pwa`, `stripe`, `ci`, `deps`, `seo`

## 4. Exemples
✅ **Correct :**
- `feat(orders): ajout statut 'pas de réponse'`
- `fix(stock): correction double déduction sur bundle`
- `docs(architecture): mise à jour schéma Firestore`

❌ **Incorrect :**
- `update code`
- `fix bug`
- `WIP`

## 5. Breaking Changes
Un BREAKING CHANGE doit être signalé avec `!` après le type :
`feat(auth)!: suppression connexion par email (Google uniquement)`
