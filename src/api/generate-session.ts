export function generateRandomSession() {
  let session = "";
  let possible = "abcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 8; i++)
    session += possible.charAt(Math.floor(Math.random() * possible.length));

  return session;
}