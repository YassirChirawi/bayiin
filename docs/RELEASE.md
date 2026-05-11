# Plan de Release & Versioning

## 1. Versioning Semver
```text
v MAJOR . MINOR . PATCH 
   │        │        └── fix, security, perf, style 
   │        └────────── feat (nouvelle fonctionnalité) 
   └─────────────────── BREAKING CHANGE (!)  
```

## 2. Processus de Release
1. **Feature PR** : `feature/*` → `develop`. Code review + CI (lint/unit/build).
2. **Staging** : Merge dans `develop`. CI se déclenche sur staging (E2E + security).
3. **Master PR** : `develop` → `master`. Suite complète de non-régression.
4. **Deploy** : Merge approuvé → Tag version auto → Deploy Prod Firebase.

## 3. Roadmap (Beta)
- **v1.0.0** : Fin de beta, QA complète, CI/CD stable, documentation finale.
- **v1.1.0** : Programme fidélité (Nqat), Score santé boutique.
- **v1.2.0** : Prédiction stock IA, Réconciliation COD avancée.
