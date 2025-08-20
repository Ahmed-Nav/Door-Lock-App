function generatePayload(userName = "TestUser", yearOfBirth = 1990) {
  const userId = `${userName}_${yearOfBirth}`;
  const timestamp = Date.now();
  return { userId, timestamp };
}

module.exports = { generatePayload };