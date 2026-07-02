import mongoose from 'mongoose';

const MONGODB_URI = "mongodb://220170116033_db_user:N7uaZNUtxO3Ilr1j@ac-u8msyrc-shard-00-00.gsye3dj.mongodb.net:27017,ac-u8msyrc-shard-00-01.gsye3dj.mongodb.net:27017,ac-u8msyrc-shard-00-02.gsye3dj.mongodb.net:27017/ai-candidate-discovery?ssl=true&replicaSet=atlas-72dt4g-shard-0&authSource=admin&retryWrites=true&w=majority";

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB Atlas.");
    
    // Define a simple Schema for Users
    const userSchema = new mongoose.Schema({
      name: String,
      email: String,
      isVerified: Boolean,
      role: String
    }, { collection: 'users' });
    
    const User = mongoose.model('User', userSchema);
    const users = await User.find({});
    console.log("Registered Users:");
    console.log(JSON.stringify(users, null, 2));

    // Define a simple Schema for OTPs
    const otpSchema = new mongoose.Schema({
      userId: mongoose.Schema.Types.ObjectId,
      otp: String,
      purpose: String,
      expiresAt: Date
    }, { collection: 'verification_otps' });

    const OTP = mongoose.model('OTP', otpSchema);
    const otps = await OTP.find({});
    console.log("Active OTPs:");
    console.log(JSON.stringify(otps, null, 2));
    
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
