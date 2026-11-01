// Grants (or revokes with --revoke) the `master` custom claim used by the app and firestore.rules.
// Usage: npm run admin:set-master -- user@example.com [--revoke]
import { adminAuth } from './admin-app';

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((arg) => !arg.startsWith('--'));
  const revoke = args.includes('--revoke');

  if (!email) {
    console.error('Usage: npm run admin:set-master -- <email> [--revoke]');
    process.exit(1);
  }

  const user = await adminAuth.getUserByEmail(email.toLowerCase().trim());
  const claims = { ...(user.customClaims || {}) };
  if (revoke) {
    delete claims.master;
  } else {
    claims.master = true;
  }
  await adminAuth.setCustomUserClaims(user.uid, claims);

  console.log(`${revoke ? 'Revoked' : 'Granted'} master role for ${user.email} (${user.uid}).`);
  console.log('The user must sign out and sign in again for the change to take effect.');
}

main().catch((err) => {
  console.error('Failed to update master claim:', err);
  process.exit(1);
});
