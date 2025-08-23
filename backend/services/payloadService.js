function generatePayload(userName = "TestUser", yearOfBirth = 1990) {
  const userId = createUserId(userName, yearOfBirth);
  const timestamp = Date.now();
  return { userId, timestamp };
}

function createUserId(userName, yearOfBirth) {
  return `${userName}_${yearOfBirth}`;
}

module.exports = { generatePayload };