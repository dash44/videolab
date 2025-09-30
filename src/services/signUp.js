import { UserRepo } from "../aws/dynamo.js";
import bcrypt from "bcrypt";
import crypto from "crypto";


export const createUser = async (username, email, password) => {
  const hashed = await bcrypt.hash(password, 10);
  const confirmationToken = crypto.randomUUID();

  await UserRepo.put({
    username,
    email,
    password: hashed,
    role: "user",
    confirmed: false,
    confirmationCode: confirmationToken,
    createdAt: new Date().toISOString()
  });


  return { username, email, confirmationToken };
};


export const confirmUser = async (username, code) => {
  const res = await UserRepo.get(username);
  const user = res.Item;

  if (!user) throw new Error("User not found");
  if (user.confirmed) return true;
  if (user.confirmationCode !== code) throw new Error("Invalid confirmation code");

  await UserRepo.confirm(username);
  return true;
};


export const authenticateUser = async (username, password) => {
  const res = await UserRepo.get(username);
  const user = res.Item;

  if (!user) throw new Error("User not found");
  if (!user.confirmed) throw new Error("User not confirmed");

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error("Invalid credentials");

  return user; 
};
