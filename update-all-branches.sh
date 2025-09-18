#!/bin/bash

echo "🔄 Actualizando todas las ramas..."

# Fetch all remote branches
echo "📥 Descargando cambios remotos..."
git fetch --all

# Get current branch
current_branch=$(git branch --show-current)

# Update all local branches
for branch in $(git branch | cut -c 3-); do
  echo "🔄 Actualizando rama: $branch"
  git checkout "$branch" 2>/dev/null
  
  # Check if branch has remote tracking
  if git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1; then
    git pull origin "$branch" 2>/dev/null || echo "⚠️  No se pudo actualizar $branch"
  else
    echo "⚠️  La rama $branch no tiene remoto"
  fi
done

# Return to original branch
echo "🔙 Regresando a la rama: $current_branch"
git checkout "$current_branch"

echo "✅ Actualización completa!"