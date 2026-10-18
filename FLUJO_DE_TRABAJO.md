# Flujo de trabajo — AAM

Cómo desarrollar mejoras en local sin arriesgar lo que está corriendo en
**producción** (`https://segtecam.space`).

---

## 1) Qué representa cada rama

| Rama | Estado | Quién la usa | Regla principal |
|------|--------|--------------|-----------------|
| `main` | **Producción** (servidor `segtectamserver`, túnel Cloudflare) | Solo integraciones probadas | Nunca se trabaja directo en ella |
| `develop` | Integración en local (laptop) | Todo el desarrollo diario | Acá se concentran las mejoras |
| `feature/*` | Mejora puntual en curso | Tú, una cosa a la vez | Se crea desde `develop`, se fusiona a `develop` |
| `hotfix/*` | Corrección urgente en producción | Emergencias | Se crea desde `main`, va a `main` y a `develop` |

```
main      ──●─────────────●──────────────●──── producción (segtecam.space)
                 \                    /
develop   ─────●──●────●────●───●────           integración local
                \        /
feature/  ───●──●                            mejora puntual
```

---

## 2) Configuración inicial (una sola vez)

```bash
git config pull.rebase true     # los pulls rebasan en vez de crear merges sucios
git checkout -b develop         # crear la rama de integración
git push -u origin develop      # publicarla en GitHub
```

---

## 3) Ciclo de trabajo por mejora

### 3.1 Crear la rama de la mejora

```bash
git checkout develop
git pull --rebase origin develop      # siempre partir actualizado
git checkout -b feature/nombre-corto   # ej: feature/precio-proveedor
```

Convención de nombres: `feature/` + guiones bajos describiendo qué hace.

### 3.2 Desarrollar

```bash
cd apps/api && npm run start:dev      # API en :3001 (recarga en caliente)
cd apps/web && npm run dev            # Web en :3000
```

- Commits pequeños y frecuentes, no uno gigante al final.
- Mensaje con convención de tipo (la que ya usamos):

  ```
  feat(venta): mostrar precio de proveedor en POS, cotizaciones y kits
  fix(pos): evitar descuento negativo al subir precio en cotización
  docs: documentar flujo de trabajo
  chore(backup): script de respaldo completo
  ```

- **Nunca** subir `.env`, credenciales, `backups/` ni tar.gz (ya está en `.gitignore`).

### 3.3 Probar en local completo

Antes de fusionar, verificar que todo levanta:

```bash
podman-compose up -d           # contenedores healthy
cd apps/api && npm run build   # detecta errores de TypeScript
cd apps/web  && npm run build  # compila + typecheck
```

Probar el flujo real en el navegador (`localhost:3000`).

### 3.4 Fusionar a `develop`

```bash
git checkout develop
git merge feature/nombre-corto
git push
git branch -d feature/nombre-corto      # limpiar rama terminada
```

### 3.5 Llevar a producción (`main`)

Solo cuando `develop` está estable y probada:

```bash
git checkout main
git pull --rebase origin main
git merge --no-ff develop        # historia explícita de qué entró
git push
```

Luego en el servidor:

```bash
cd ~/AAM
git pull
cd apps/api && npm run build
cd apps/web && npm run build
./iniciar.sh                     # contenedores + backend + frontend + túnel
curl -I https://segtecam.space              # -> 200
curl -I https://segtecam.space/api/catalogo # -> 200
```

---

## 4) Producción se rompió: hotfix

```bash
git checkout main
git checkout -b hotfix/lo-que-se-rompio
# ... corrección mínima ...
git commit -am "fix(...): ..."
git checkout main && git merge hotfix/lo-que-se-rompio
git push
# deploy en el servidor (§3.5)
git checkout develop && git merge main     # llevar la corrección a develop
git branch -d hotfix/lo-que-se-rompio
```

---

## 5) Reglas de oro

1. **`main` = producción.** Si no está probado, no entra.
2. **Nunca trabajar directo en `main`** (ni siquiera "una cosita").
3. **Pull con rebase** antes de fusionar: `git pull --rebase origin <rama>`.
4. **Respaldo antes de restauraciones/migraciones grandes**: `./backup.sh`
   → `backups/AAM-data-AAAAAMMDD.tar.gz` (ignorado por git, se copia por SSH).
5. **Credenciales fuera del repo**: `.env` local, nunca commiteado.
6. **En el servidor, nunca `next dev` frente a Cloudflare**: siempre `build` +
   `next start` (README §3).
7. Si un `merge` sale mal y aún no se ha hecho `push`, no hay daño:
   `git merge --abort` o `git reset --hard origin/main`.

---

## 6) Comandos de rescate

| Situación | Comando |
|-----------|---------|
| Volver a production limpia | `git checkout main && git reset --hard origin/main` |
| Ver en qué rama estás y qué cambió | `git status` / `git log --oneline --graph -10` |
| Abortar un merge a medias | `git merge --abort` |
| Cancelar un rebase a medias | `git rebase --abort` |
| Ver qué cambió respecto a producción | `git diff main...develop` |
| Ver ramas ya fusionadas | `git branch --merged develop` |

---

## 7) Resumen en 6 pasos

```bash
git checkout develop && git pull --rebase origin develop
git checkout -b feature/mi_mejora
# ... desarrollar y probar ...
git checkout develop && git merge feature/mi_mejora && git push
git checkout main && git merge --no-ff develop && git push
# servidor: git pull + builds + ./iniciar.sh
```
