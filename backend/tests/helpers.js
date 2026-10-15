const { generateToken } = require('../src/middleware/auth');
const InMemoryStore = require('../src/services/inMemoryStore');

const SEED = {
  customer: 'customer@canteen.com',
  staff: 'staff@canteen.com',
  manager: 'manager@canteen.com',
  admin: 'admin@canteen.com'
};

const tokenFor = (email) => {
  const user = InMemoryStore.findUserByEmail(email);
  if (!user) throw new Error(`Seed user not found: ${email}`);
  return generateToken(user);
};

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { SEED, tokenFor, authHeader };
