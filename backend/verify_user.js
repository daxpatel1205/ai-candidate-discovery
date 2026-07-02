import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const emailArg = process.argv[2];
const passwordArg = process.argv[3];

if (!emailArg) {
  console.error("Please provide an email address. Usage: node verify_user.js <email> [new_password]");
  process.exit(1);
}

async function run() {
  try {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is not set in environment or .env file.");
    }

    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB database.");

    // Simple schema to interact with users collection
    const userSchema = new mongoose.Schema({
      name: String,
      email: String,
      passwordHash: String,
      isVerified: Boolean,
      status: String
    }, { collection: 'users', timestamps: true });

    const User = mongoose.model('User', userSchema);

    const email = emailArg.toLowerCase().trim();
    const user = await User.findOne({ email });

    if (!user) {
      console.error(`User with email "${email}" not found.`);
      process.exit(1);
    }

    user.isVerified = true;
    user.status = 'active';
    console.log(`Setting isVerified = true and status = 'active' for user: ${user.name} (${user.email})`);

    if (passwordArg) {
      const hashed = await bcrypt.hash(passwordArg, 12);
      user.passwordHash = hashed;
      console.log(`Password reset to: ${passwordArg}`);
    }

    await user.save();
    console.log("User successfully verified and updated!");

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
