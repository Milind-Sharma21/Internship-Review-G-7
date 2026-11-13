import { Schema, model } from "mongoose";
import { connectMaster, disconnectMaster } from "../connection/masterConnection";

const noteSchema = new Schema({
  title: { type: String, required: true },
  priority: { type: Number, default: 1, min: 1, max: 5 },
});
const Note = model("PlaygroundNote", noteSchema);

async function main(): Promise<void> {
  await connectMaster();

  const created = await Note.create({ title: "learn mongoose" });
  console.log("created:", created.toObject());

  const found = await Note.find({ priority: 1 });
  console.log("found:", found.length);

  await Note.updateOne({ _id: created._id }, { priority: 3 });
  console.log("after update:", (await Note.findById(created._id))?.priority);

  try {
    await Note.create({ priority: 99 });
  } catch (e) {
    console.log("validation error (expected):", (e as Error).message);
  }

  await Note.deleteMany({});
  await disconnectMaster();
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});