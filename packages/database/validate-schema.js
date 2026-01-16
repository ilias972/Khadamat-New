const fs = require('fs');
const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Extraire tous les modèles
const models = {};
const modelRegex = /model (\w+) \{([\s\S]*?)\n\}/g;
let match;

while ((match = modelRegex.exec(schema)) !== null) {
  const modelName = match[1];
  const body = match[2];

  // Extraire les relations
  const relationRegex = /(\w+)\s+(\w+)(\[\])?\s+@relation/g;
  const relations = [];
  let relMatch;

  while ((relMatch = relationRegex.exec(body)) !== null) {
    relations.push({
      field: relMatch[1],
      type: relMatch[2],
      isArray: !!relMatch[3]
    });
  }

  models[modelName] = relations;
}

console.log('=== VALIDATION DES RELATIONS BIDIRECTIONNELLES ===\n');

let errors = 0;
const checked = new Set();

Object.entries(models).forEach(([modelName, relations]) => {
  relations.forEach(rel => {
    const key = `${modelName}->${rel.type}`;
    const reverseKey = `${rel.type}->${modelName}`;

    if (checked.has(key) || checked.has(reverseKey)) return;
    checked.add(key);

    const targetModel = models[rel.type];
    if (!targetModel) {
      console.log(`❌ ${modelName}.${rel.field} → ${rel.type} (modèle introuvable)`);
      errors++;
      return;
    }

    const hasReverse = targetModel.some(r => r.type === modelName);
    if (hasReverse) {
      console.log(`✅ ${modelName} ↔ ${rel.type}`);
    } else {
      console.log(`❌ ${modelName} → ${rel.type} (relation inverse manquante)`);
      errors++;
    }
  });
});

console.log(`\n=== RÉSULTAT ===`);
console.log(`Total relations: ${checked.size}`);
console.log(`Erreurs: ${errors}`);

if (errors === 0) {
  console.log(`\n✅ SCHÉMA PRISMA VALIDE`);
  process.exit(0);
} else {
  console.log(`\n❌ SCHÉMA INVALIDE - ${errors} erreur(s)`);
  process.exit(1);
}
