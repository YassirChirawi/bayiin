# Stratégie de Branches (GitFlow)

```text
master  (production — toujours stable) 
  └── develop  (intégration — base de toutes les features) 
        ├── feature/nom-feature 
        └── hotfix/nom-hotfix  ← depuis master directement 
```

## 1. Branches principales

| Branche | Rôle | Règle |
|---|---|---|
| **master** | Production | JAMAIS de push direct. PR obligatoire depuis develop. |
| **develop** | Intégration | PR obligatoire. La CI doit passer à 100% avant le merge. |

## 2. Branches secondaires

| Type | Créée depuis | Mergée vers | Description |
|---|---|---|---|
| **feature/*** | develop | develop | Une branche par fonctionnalité. |
| **hotfix/*** | master | master + develop | Correctif critique en production. |
| **release/*** | develop | master + develop | Préparation d'une version majeure. |

## 3. Nommage
Format : `[type]/[description-en-kebab-case]`

Exemples :
- `feature/segmentation-clients-ville`
- `feature/beya3-prediction-stock`
- `hotfix/ios-notification-crash`
