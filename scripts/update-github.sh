#!/bin/bash

# Script til at holde GitHub opdateret med udvikling
# Kør dette script efter hver større ændring

echo "🚀 Opdaterer GitHub med nuværende udvikling..."

# Tjek git status
echo "📊 Tjekker git status..."
git status

# Tilføj alle ændringer
echo "➕ Tilføjer alle ændringer..."
git add .

# Commit med beskrivende besked
echo "💾 Committer ændringer..."
git commit -m "$1"

# Push til GitHub
echo "📤 Pusher til GitHub..."
git push origin main

echo "✅ GitHub er nu opdateret!"
echo "🔗 Repository: https://github.com/Skallerup/acumba.git"
