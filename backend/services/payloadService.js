function generatePayload(userEmail = "test@example.com") {
  const userId = createUserId(userEmail);
  const timestamp = Date.now();
  return { userId, timestamp };
}

function createUserId(userEmail) {
  return userEmail;
}

module.exports = { generatePayload };