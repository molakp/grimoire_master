import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { adminDb as db } from './admin-app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templatesDir = path.join(__dirname, '../src/data/templates');

async function seed() {
  const files = fs.readdirSync(templatesDir).filter((f) => f.endsWith('.json'));
  const batch = db.batch();

  for (const file of files) {
    const content = fs.readFileSync(path.join(templatesDir, file), 'utf8');
    const template = JSON.parse(content);
    // Firestore doesn't allow nested arrays; wrap each gear choice group as { options: [...] }
    if (Array.isArray(template.gearChoices)) {
      template.gearChoices = template.gearChoices.map((group: any[]) => ({ options: group }));
    }
    const ref = db.collection('templates').doc(template.id);
    batch.set(ref, template);
    console.log(`Queued: ${template.id} (${template.class})`);
  }

  await batch.commit();
  console.log(`\nDone! Seeded ${files.length} templates to Firestore.`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
