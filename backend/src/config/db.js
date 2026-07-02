import mongoose from 'mongoose';

const localUri = process.env.MONGODB_URI_LOCAL || 'mongodb://localhost:27017/ai-candidate-discovery';
const primaryUri = process.env.MONGODB_URI || localUri;

async function tryConnect(uri) {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log(`MongoDB connected: ${uri}`);
}

export async function connectDB() {
  try {
    await tryConnect(primaryUri);
  } catch (err) {
    console.warn(`Primary MongoDB connection failed: ${err.message}`);

    if (primaryUri !== localUri) {
      console.warn(`Falling back to local MongoDB at ${localUri}`);
      await tryConnect(localUri);
      return;
    }

    throw err;
  }
}
