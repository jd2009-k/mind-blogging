// Keep this validation and sequencing dependency-free so it can be exercised in Node tests.
export async function eraseAccount({user, body, now = Date.now(), clearPush, deleteAuthUser}) {
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (body?.confirmation !== 'DELETE MY ACCOUNT' ||
      !user?.id || !user?.email || email !== user.email.trim().toLowerCase()) {
    return {status:422, body:{error:'Confirm account deletion with the exact phrase and your signed-in email.'}};
  }
  // An access token refreshed in the background is not proof of recent authentication.
  // Require a fresh sign-in for this destructive operation (works for password and OAuth users).
  const lastSignIn = Date.parse(user.last_sign_in_at || '');
  if (!Number.isFinite(lastSignIn) || lastSignIn > now ||
      now - lastSignIn > 15 * 60 * 1000) {
    return {status:403, body:{error:'For safety, sign out and sign in again, then retry account deletion within 15 minutes.'}};
  }
  try {
    // If push cleanup fails, retain the user so that removal can be retried.
    await clearPush(user.id);
  } catch {
    return {status:503, body:{error:'Could not remove notification subscriptions. Your account has not been deleted; retry later.'}};
  }
  try {
    // The database FK (ON DELETE CASCADE) removes this user's mind_blog_records.
    await deleteAuthUser(user.id);
  } catch {
    return {status:503, body:{error:'Account deletion could not be completed. Retry later or contact support.'}};
  }
  return {status:200, body:{complete:true}};
}
